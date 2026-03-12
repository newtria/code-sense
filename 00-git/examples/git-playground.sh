#!/bin/bash
# Git 실습 스크립트
# 실행: bash git-playground.sh
#
# 임시 디렉토리에서 Git의 핵심 동작을 단계별로 체험한다.

set -e

PLAYGROUND=$(mktemp -d)
echo "=== Git Playground ==="
echo "실습 디렉토리: $PLAYGROUND"
echo ""

cd "$PLAYGROUND"

# ============================================
# 1. 저장소 초기화
# ============================================
echo "=== 1. git init ==="
git init
git config user.name "학습자"
git config user.email "learner@test.com"
echo ""

# ============================================
# 2. Git의 3개 영역 이해
# ============================================
echo "=== 2. 3개 영역: Working → Staging → Repository ==="
echo ""

echo "Hello World" > hello.txt
echo "  파일 생성 후 상태:"
git status --short
echo "  → ?? hello.txt (Untracked — Git이 아직 모르는 파일)"
echo ""

git add hello.txt
echo "  git add 후 상태:"
git status --short
echo "  → A  hello.txt (Staged — 다음 커밋에 포함될 준비)"
echo ""

git commit -m "첫 번째 커밋: hello.txt 추가"
echo ""
echo "  git commit 후 상태:"
git status --short
echo "  → (깨끗함 — 모든 변경이 커밋됨)"
echo ""

# ============================================
# 3. 변경 → 확인 → 커밋
# ============================================
echo "=== 3. 변경 추적 ==="
echo "Hello Git" >> hello.txt
echo "new file" > world.txt

echo "  두 파일을 변경/생성 후:"
git status --short
echo "   M hello.txt  (Modified — 추적 중인 파일이 변경됨)"
echo "  ?? world.txt  (Untracked)"
echo ""

echo "  git diff (변경 내용 확인):"
git diff
echo ""

git add -A
git commit -m "두 번째 커밋: 파일 수정 및 추가"
echo ""

# ============================================
# 4. 브랜치
# ============================================
echo "=== 4. 브랜치 ==="
git branch feature/login
git checkout feature/login
echo "login feature" > login.txt
git add login.txt
git commit -m "로그인 기능 추가"

echo "  현재 브랜치 목록:"
git branch
echo ""

echo "  feature/login의 커밋 로그:"
git log --oneline
echo ""

# main으로 돌아가서 머지
git checkout main 2>/dev/null || git checkout master
echo "  main으로 돌아온 후 (login.txt가 없음):"
ls
echo ""

git merge feature/login -m "feature/login 머지"
echo "  머지 후 (login.txt가 생김):"
ls
echo ""

# ============================================
# 5. 되돌리기
# ============================================
echo "=== 5. 되돌리기 ==="

echo "실수!" > mistake.txt
git add mistake.txt
echo "  실수로 스테이징한 파일 되돌리기:"
git restore --staged mistake.txt
git status --short
echo "  → mistake.txt가 Unstaged로 돌아옴"
echo ""

echo "  커밋 후 되돌리기 (revert — 새 커밋으로 취소):"
echo "bad code" > bad.txt
git add bad.txt
git commit -m "잘못된 커밋"
git revert HEAD --no-edit
echo ""
echo "  revert 후 로그:"
git log --oneline -3
echo "  → '잘못된 커밋'을 취소하는 새 커밋이 생김 (히스토리 보존)"
echo ""

# ============================================
# 6. 커밋 로그
# ============================================
echo "=== 6. 전체 히스토리 ==="
git log --oneline --graph --all
echo ""

# 정리
echo "=== 완료 ==="
echo "실습 디렉토리: $PLAYGROUND"
echo "직접 cd로 이동해서 추가 실험해보세요."
echo "삭제하려면: rm -rf \"$PLAYGROUND\""
