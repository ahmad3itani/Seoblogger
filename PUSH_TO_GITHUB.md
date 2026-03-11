# Push Code to GitHub - Manual Steps

## Issue: Token Permission Error

Your GitHub token doesn't have write access to the repository. Here's how to fix it:

---

## Option 1: Use GitHub Desktop (Easiest)

1. **Download GitHub Desktop:** https://desktop.github.com/
2. **Install and sign in** with your GitHub account
3. **Add repository:**
   - File → Add Local Repository
   - Choose: `C:\Users\ahmad\Desktop\BloggerSEO`
   - Click "Add Repository"
4. **Publish repository:**
   - Click "Publish repository"
   - Repository name: `bloggerseo`
   - Keep private: ✅ (checked)
   - Click "Publish Repository"

**Done!** Your code is now on GitHub.

---

## Option 2: Generate New Token with Correct Permissions

1. **Go to:** https://github.com/settings/tokens/new

2. **Fill in:**
   - Note: `BloggerSEO Deployment`
   - Expiration: 90 days (or custom)
   - Select scopes:
     - ✅ `repo` (Full control of private repositories)
     - ✅ `workflow` (Update GitHub Action workflows)

3. **Click "Generate token"**

4. **Copy the new token** (starts with `ghp_` or `github_pat_`)

5. **Run these commands:**
   ```bash
   git remote set-url origin https://ahmad3itani:YOUR_NEW_TOKEN@github.com/ahmad3itani/bloggerseo.git
   git push -u origin main
   ```

---

## Option 3: Use SSH (More Secure)

1. **Generate SSH key:**
   ```bash
   ssh-keygen -t ed25519 -C "your_email@example.com"
   ```
   Press Enter for all prompts (use default location)

2. **Copy SSH key:**
   ```bash
   cat ~/.ssh/id_ed25519.pub
   ```

3. **Add to GitHub:**
   - Go to: https://github.com/settings/keys
   - Click "New SSH key"
   - Paste the key
   - Click "Add SSH key"

4. **Update remote and push:**
   ```bash
   git remote set-url origin git@github.com:ahmad3itani/bloggerseo.git
   git push -u origin main
   ```

---

## Recommended: Use GitHub Desktop

It's the easiest and most reliable method. Download here:
https://desktop.github.com/

Once you've pushed the code using any method above, let me know and we'll continue with Vercel deployment!
