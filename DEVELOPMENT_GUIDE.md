# Development Guide - Git Workflow for Northstar

This guide shows John how to safely make changes using Git branches instead of working directly on the main branch.

## Why Use Branches?

- **Safety**: Main branch stays stable and working
- **Organization**: Each feature/fix gets its own branch
- **Collaboration**: Multiple people can work on different features
- **Rollback**: Easy to undo changes if something breaks

## Basic Workflow

### 1. Always Start with Updated Main Branch
```bash
git checkout main
git pull origin main
```

### 2. Create a New Branch for Your Feature
```bash
git checkout -b feature/your-feature-name
```

**Example branch names:**
- `feature/mobile-navigation`
- `feature/photo-progress`
- `bugfix/login-issue`
- `enhancement/onboarding-flow`

### 3. Make Your Changes
- Edit files in Replit as normal
- Test your changes
- Make sure everything works

### 4. Stage and Commit Your Changes
```bash
git add .
git commit -m "Add mobile navigation with bottom tabs"
```

**Good commit message examples:**
- `Add photo progress tracking feature`
- `Fix daily check-in streak calculation`
- `Improve onboarding flow with guided tour`
- `Update UI colors for better contrast`

### 5. Push Your Branch to GitHub
```bash
git push origin feature/your-feature-name
```

### 6. Create a Pull Request
1. Go to your GitHub repository
2. Click "Compare & pull request" 
3. Add a description of what you changed
4. Click "Create pull request"

### 7. Merge After Review
1. Review your changes one more time
2. Click "Merge pull request"
3. Click "Confirm merge"
4. Delete the branch (GitHub will offer this option)

### 8. Clean Up Locally
```bash
git checkout main
git pull origin main
git branch -d feature/your-feature-name
```

## Common Commands Cheat Sheet

### Check Current Status
```bash
git status                    # See what files changed
git branch                    # See what branch you're on
git log --oneline            # See recent commits
```

### Branch Management
```bash
git checkout main            # Switch to main branch
git checkout -b new-feature  # Create and switch to new branch
git branch -d branch-name    # Delete a branch
```

### Making Changes
```bash
git add .                    # Stage all changes
git add filename.txt         # Stage specific file
git commit -m "message"      # Commit with message
git push origin branch-name  # Push to GitHub
```

### Getting Updates
```bash
git pull origin main         # Get latest main branch
git fetch origin             # Get all branch updates
```

## Emergency Commands

### Undo Last Commit (but keep changes)
```bash
git reset --soft HEAD~1
```

### Discard All Uncommitted Changes
```bash
git checkout .
```

### See What Changed in a File
```bash
git diff filename.txt
```

## Example Development Session

Here's a complete example of adding a new feature:

```bash
# 1. Start with fresh main branch
git checkout main
git pull origin main

# 2. Create feature branch
git checkout -b feature/achievement-badges

# 3. Make your changes in Replit
# (edit files, test, etc.)

# 4. Commit your work
git add .
git commit -m "Add achievement badge system with streak rewards"

# 5. Push to GitHub
git push origin feature/achievement-badges

# 6. Go to GitHub and create Pull Request

# 7. After merging, clean up
git checkout main
git pull origin main
git branch -d feature/achievement-badges
```

## Best Practices

### Branch Naming
- Use descriptive names
- Include the type: `feature/`, `bugfix/`, `enhancement/`
- Keep it short but clear

### Commit Messages
- Start with a verb: "Add", "Fix", "Update", "Remove"
- Be specific about what changed
- Keep it under 50 characters when possible

### When to Commit
- After completing a logical piece of work
- Before switching to a different task
- At the end of each coding session
- When tests are passing

### Testing Before Commits
- Always test your changes in Replit
- Make sure the app still runs
- Check that existing features still work
- Test on mobile if you changed UI

## Troubleshooting

### "Branch already exists"
```bash
git checkout existing-branch-name
```

### "Cannot switch branches, uncommitted changes"
```bash
git add .
git commit -m "Work in progress"
# Then switch branches
```

### "Merge conflicts"
1. Edit the conflicted files
2. Remove the conflict markers (`<<<<<<<`, `=======`, `>>>>>>>`)
3. Keep the code you want
4. Commit the resolved files

### "Accidentally committed to main"
```bash
git checkout -b feature/oops-new-branch
git checkout main
git reset --hard HEAD~1
git checkout feature/oops-new-branch
```

## Remember

- **Never work directly on main branch** for new features
- **Always test before committing**
- **Write clear commit messages**
- **Pull latest main before creating new branches**
- **Delete branches after merging** to keep things clean

This workflow keeps your code organized and makes it easy to experiment with new features without breaking what's already working!