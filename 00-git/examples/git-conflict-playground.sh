#!/bin/bash
# Git 고급 실습 스크립트 — 충돌 해결, stash, rebase
# 실행: bash git-conflict-playground.sh
#
# 임시 디렉토리에서 실습하고 마지막에 자동 정리한다.
# 모든 단계마다 출력을 보여주어 흐름을 이해할 수 있도록 했다.

set -e

PLAYGROUND=$(mktemp -d)
trap 'rm -rf "$PLAYGROUND"' EXIT

echo "============================================"
echo "  Git 고급 실습 — 충돌, stash, rebase"
echo "============================================"
echo "  실습 디렉토리: $PLAYGROUND"
echo ""

cd "$PLAYGROUND"

# 저장소 초기화
git init -q
git config user.name "학습자"
git config user.email "learner@test.com"

cat > shared.txt << 'EOF'
첫 번째 줄
두 번째 줄
세 번째 줄
EOF
git add shared.txt
git commit -q -m "초기 커밋: shared.txt"
echo "[준비] 초기 커밋 완료"
echo ""

MAIN_BRANCH=$(git branch --show-current)

# ============================================
# 1. 머지 충돌 (Merge Conflict) 만들고 해결하기
# ============================================
echo "============================================"
echo "  1. 머지 충돌 만들고 해결하기"
echo "============================================"
echo ""
echo "  시나리오: 두 브랜치에서 같은 파일의 같은 줄을 다르게 수정"
echo ""

# feature-a 브랜치: 두 번째 줄을 수정
git checkout -q -b feature-a
cat > shared.txt << 'EOF'
첫 번째 줄
feature-a가 수정한 두 번째 줄
세 번째 줄
EOF
git add shared.txt
git commit -q -m "feature-a: 두 번째 줄 수정"
echo "  [feature-a] 두 번째 줄을 수정하고 커밋"

# main으로 돌아가서 같은 줄을 다르게 수정
git checkout -q "$MAIN_BRANCH"
cat > shared.txt << 'EOF'
첫 번째 줄
main에서 수정한 두 번째 줄
세 번째 줄
EOF
git add shared.txt
git commit -q -m "main: 두 번째 줄 수정"
echo "  [main]      같은 두 번째 줄을 다르게 수정하고 커밋"
echo ""

# 머지 시도 — 충돌 발생!
echo "  >>> git merge feature-a 시도..."
echo ""
if git merge feature-a 2>&1; then
  echo "  (충돌이 발생하지 않음)"
else
  echo ""
  echo "  +++ 충돌 발생! 파일 내용: +++"
  echo "  -------------------------------------------"
  while IFS= read -r line; do
    echo "  | $line"
  done < shared.txt
  echo "  -------------------------------------------"
  echo ""
  echo "  충돌 마커 해석:"
  echo "    <<<<<<< HEAD        = 현재 브랜치(main)의 내용"
  echo "    =======             = 구분선"
  echo "    >>>>>>> feature-a   = 머지하려는 브랜치의 내용"
  echo ""

  # 충돌 해결
  echo "  >>> 충돌 해결 — 두 변경을 통합하여 새로 작성"
  cat > shared.txt << 'EOF'
첫 번째 줄
main과 feature-a의 변경을 모두 반영한 두 번째 줄
세 번째 줄
EOF

  echo "  해결된 파일:"
  while IFS= read -r line; do
    echo "  | $line"
  done < shared.txt
  echo ""

  git add shared.txt
  git commit -q -m "충돌 해결: main + feature-a 통합"
  echo "  >>> 충돌 해결 커밋 완료!"
fi
echo ""

echo "  커밋 로그:"
git log --oneline --graph --all | while IFS= read -r line; do echo "  $line"; done
echo ""

# ============================================
# 2. git stash — 작업 임시 저장
# ============================================
echo "============================================"
echo "  2. git stash — 작업 임시 저장"
echo "============================================"
echo ""
echo "  시나리오: 기능 개발 중에 긴급 버그 수정 요청이 들어옴"
echo "  -> 작업 중인 변경사항을 stash로 임시 보관하고,"
echo "     버그를 고친 뒤, stash pop으로 다시 꺼낸다."
echo ""

# 기능 개발 중이라고 가정
echo "개발 중인 새 기능 코드" > feature.txt
cat > shared.txt << 'EOF'
첫 번째 줄
main과 feature-a의 변경을 모두 반영한 두 번째 줄
세 번째 줄
추가 작업 중...
EOF
git add feature.txt

echo "  작업 상태 (스테이징된 파일 + 수정된 파일 있음):"
git status --short | while IFS= read -r line; do echo "    $line"; done
echo ""

# stash로 작업 저장
echo "  >>> git stash push -m '기능 개발 중 임시 저장'"
git stash push -m "기능 개발 중 임시 저장"
echo ""

echo "  stash 후 상태:"
STATUS=$(git status --short)
if [ -z "$STATUS" ]; then
  echo "    (변경사항 없음 — 깨끗!)"
else
  echo "$STATUS" | while IFS= read -r line; do echo "    $line"; done
fi
echo "  -> 작업 디렉토리가 깨끗해짐. 이제 긴급 수정 가능!"
echo ""

echo "  stash 목록:"
git stash list | while IFS= read -r line; do echo "    $line"; done
echo ""

# 긴급 버그 수정
echo "  >>> 긴급 버그 수정 작업"
echo "버그 수정 완료" > bugfix.txt
git add bugfix.txt
git commit -q -m "긴급: 버그 수정"
echo "  긴급 수정 커밋 완료!"
echo ""

# stash 복원
echo "  >>> git stash pop (이전 작업 복원)"
git stash pop
echo ""

echo "  pop 후 상태 (이전에 하던 작업이 돌아옴):"
git status --short | while IFS= read -r line; do echo "    $line"; done
echo ""

STASH_LIST=$(git stash list)
if [ -z "$STASH_LIST" ]; then
  echo "  stash 목록: (비어 있음 — pop하면 stash에서 제거됨)"
else
  echo "  stash 목록:"
  echo "$STASH_LIST" | while IFS= read -r line; do echo "    $line"; done
fi
echo ""

echo "  참고: git stash pop vs git stash apply"
echo "    pop   = 복원 + stash에서 제거"
echo "    apply = 복원만 (stash에 남아 있음, 여러 번 적용 가능)"
echo ""

# 정리: 작업 중인 파일 커밋
git add -A
git commit -q -m "기능 개발 재개 후 커밋"

# ============================================
# 3. git rebase vs merge — 히스토리 차이
# ============================================
echo "============================================"
echo "  3. rebase vs merge — 히스토리 비교"
echo "============================================"
echo ""
echo "  목표: feature 브랜치를 main에 합칠 때의 두 가지 방법 비교"
echo "    merge  -> 머지 커밋이 생기며 분기(갈래)가 보임"
echo "    rebase -> 히스토리가 일직선으로 정리됨"
echo ""

# --- (A) merge 방식 ---
echo "  --- (A) merge 방식 ---"
echo ""
git checkout -q "$MAIN_BRANCH"
git checkout -q -b feature-merge
echo "merge 브랜치 작업 1" > merge-work.txt
git add merge-work.txt
git commit -q -m "feature-merge: 작업 1"
echo "merge 브랜치 작업 2" >> merge-work.txt
git add merge-work.txt
git commit -q -m "feature-merge: 작업 2"

# 그 사이에 main에 새 커밋 추가 (분기를 만들기 위해)
git checkout -q "$MAIN_BRANCH"
echo "main 신규 작업" > main-new.txt
git add main-new.txt
git commit -q -m "main: merge 테스트용 신규 커밋"

# merge
git merge feature-merge -m "feature-merge 브랜치 머지" -q
echo "  merge 결과 로그 (분기가 보임):"
git log --oneline --graph -6 | while IFS= read -r line; do echo "    $line"; done
echo ""

# --- (B) rebase 방식 ---
echo "  --- (B) rebase 방식 ---"
echo ""
git checkout -q "$MAIN_BRANCH"
git checkout -q -b feature-rebase
echo "rebase 브랜치 작업 1" > rebase-work.txt
git add rebase-work.txt
git commit -q -m "feature-rebase: 작업 1"
echo "rebase 브랜치 작업 2" >> rebase-work.txt
git add rebase-work.txt
git commit -q -m "feature-rebase: 작업 2"

# main에 또 새 커밋 추가
git checkout -q "$MAIN_BRANCH"
echo "main 또 다른 작업" > main-new2.txt
git add main-new2.txt
git commit -q -m "main: rebase 테스트용 신규 커밋"

# rebase 후 fast-forward merge
git checkout -q feature-rebase
echo "  >>> git rebase $MAIN_BRANCH"
echo "      (feature-rebase의 커밋을 main 최신 위로 재배치)"
git rebase "$MAIN_BRANCH" -q
echo ""

git checkout -q "$MAIN_BRANCH"
git merge feature-rebase -q  # fast-forward merge

echo "  rebase + fast-forward 결과 로그 (일직선):"
git log --oneline --graph -6 | while IFS= read -r line; do echo "    $line"; done
echo ""

# --- 비교 정리 ---
echo "  ============================================"
echo "           merge vs rebase 비교"
echo "  ============================================"
echo "                merge           rebase"
echo "  -----------  --------------  ---------------"
echo "  히스토리      분기가 보임      일직선"
echo "  안전성        기존 커밋 유지   커밋 해시 변경"
echo "  충돌 해결     한 번에          커밋마다 각각"
echo "  사용 시점     공유 브랜치      로컬 브랜치"
echo "  ============================================"
echo ""
echo "  [경고] 이미 push한 커밋을 rebase하면 동료의 작업이 꼬인다!"
echo "  -> rebase는 아직 push하지 않은 로컬 커밋에만 사용하라."
echo ""

# ============================================
# 전체 히스토리
# ============================================
echo "============================================"
echo "  전체 히스토리"
echo "============================================"
echo ""
git log --oneline --graph --all | while IFS= read -r line; do echo "  $line"; done
echo ""

# ============================================
# 정리
# ============================================
echo "============================================"
echo "  실습 완료 — 임시 디렉토리 자동 삭제됨"
echo "============================================"
