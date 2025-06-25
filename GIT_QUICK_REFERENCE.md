# Git Quick Reference - Northstar Development

## Daily Workflow (Copy & Paste Ready)

### Starting New Feature
```bash
git checkout main
git pull origin main
git checkout -b feature/your-feature-name
```

### Saving Your Work
```bash
git add .
git commit -m "Describe what you changed"
git push origin feature/your-feature-name
```

### Finishing Feature
1. Go to GitHub → Create Pull Request
2. Review & Merge
3. Clean up:
```bash
git checkout main
git pull origin main
git branch -d feature/your-feature-name
```

## Branch Name Examples
- `feature/mobile-navigation`
- `feature/photo-progress`  
- `bugfix/login-issue`
- `enhancement/onboarding-flow`

## Good Commit Messages
- `Add achievement badge system`
- `Fix daily check-in streak calculation`
- `Improve mobile navigation layout`
- `Update goal progress visualization`

## Emergency Commands
```bash
git status                    # What changed?
git checkout .               # Undo all changes
git reset --soft HEAD~1      # Undo last commit
```

## Before You Start Coding
1. `git checkout main`
2. `git pull origin main`  
3. `git checkout -b feature/new-thing`

## Before You Stop Coding
1. `git add .`
2. `git commit -m "What you did"`
3. `git push origin your-branch-name`

**Remember: Never work directly on main branch!**