# GitHub Push Protection Guide

If you encounter this error when pushing:

```
remote: error: GH013: Repository rule violations found
remote: - GITHUB PUSH PROTECTION
remote: Push cannot contain secrets
```

## Option 1: Use GitHub's unblock URL (Quickest)

1. Visit this URL to allow the push with the credential (only do this if intended):
   https://github.com/daddyholnes/gemini-dev-studio/security/secret-scanning/unblock-secret/2xBa26Lr1UXgcJ07UgNV7maD5ag

## Option 2: Use a personal access token with override privileges

1. Create a GitHub personal access token with the "security_events: write" permission
2. Use this token when pushing:
   ```
   git push https://USERNAME:YOUR_PAT@github.com/daddyholnes/gemini-dev-studio.git
   ```

The Google Cloud service account file has been added to .gitignore to prevent future issues.
