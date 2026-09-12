# Git & Version Control Basics

Git is a distributed version control system used by virtually every software and security project. Understanding Git is essential whether you are writing scripts, collaborating on code, or submitting coursework.

---

## Core Concepts

**Repository (repo)** — A directory that Git tracks. Contains all your files plus a hidden `.git` folder with the entire history.

**Commit** — A saved snapshot of your changes. Think of it as a save point you can always return to.

**Branch** — A parallel line of development. The default branch is usually called `main` or `master`.

**Remote** — A version of your repository hosted elsewhere (e.g., GitHub or GitLab).

**Staging area (index)** — A preparation zone where you decide which changes to include in your next commit.

---

## 1. First-Time Setup

Run these once on a new machine to identify yourself in commits:

```bash
git config --global user.name "Your Name"
git config --global user.email "your.email@example.com"
```

Check your configuration:

```bash
git config --list
```

---

## 2. Creating or Cloning a Repository

**Start a new repo from scratch:**

```bash
mkdir my-project
cd my-project
git init
```

**Clone an existing remote repo:**

```bash
git clone https://github.com/username/repository.git
cd repository
```

---

## 3. The Basic Workflow

Every Git workflow follows the same loop:

**Check what has changed:**

```bash
git status
```

**See the actual diff:**

```bash
git diff
```

**Stage changes you want to commit:**

```bash
# Stage a specific file
git add filename.py

# Stage all changed files in the current directory
git add .
```

**Commit the staged changes with a message:**

```bash
git commit -m "Add password validation function"
```

> **Good commit messages** are short (under 72 characters) and describe *what* changed and *why*, not *how*.

---

## 4. Working with Remotes

**Push your commits to GitHub:**

```bash
git push origin main
```

**Pull the latest changes from the remote:**

```bash
git pull origin main
```

**View all remote connections:**

```bash
git remote -v
```

**Add a remote to an existing local repo:**

```bash
git remote add origin https://github.com/username/repository.git
```

---

## 5. Branching

Branches let you work on new features without affecting the main codebase.

**Create and switch to a new branch:**

```bash
git checkout -b feature/login-page
```

**List all branches:**

```bash
git branch
```

**Switch to an existing branch:**

```bash
git checkout main
```

**Merge a branch back into main:**

```bash
git checkout main
git merge feature/login-page
```

**Delete a branch after merging:**

```bash
git branch -d feature/login-page
```

---

## 6. Viewing History

**See the commit log:**

```bash
git log
```

**Compact one-line log:**

```bash
git log --oneline
```

**See what changed in a specific commit:**

```bash
git show abc1234
```

---

## 7. Undoing Mistakes

**Unstage a file (keep changes, just remove from staging):**

```bash
git restore --staged filename.py
```

**Discard local changes to a file (permanent):**

```bash
git restore filename.py
```

**Undo the last commit but keep the changes staged:**

```bash
git reset --soft HEAD~1
```

> **Warning:** Never rewrite history on commits that have already been pushed to a shared remote unless you know exactly what you are doing.

---

## 8. .gitignore

Create a `.gitignore` file in your repo root to tell Git which files to never track:

```
# Python
__pycache__/
*.pyc
.env

# Secrets — NEVER commit these
*.key
*.pem
config/secrets.json

# OS files
.DS_Store
Thumbs.db
```

> **Security note:** Never commit API keys, passwords, or private keys to a repository. Once pushed, they are in the history forever (even if deleted later) and should be considered compromised.

---

## Key Takeaways

- `git status` and `git log` are your best friends
- Commit often with descriptive messages
- Use branches for new features or experiments
- Never commit secrets or credentials
- Pull before you push to avoid merge conflicts

---

*Next: Check out the Linux Basics tutorial to build confidence with the command line that underpins all of Git's operations.*
