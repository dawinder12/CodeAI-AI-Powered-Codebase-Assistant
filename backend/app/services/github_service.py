import base64
import os
import httpx
from typing import List, Dict, Any
from app.config import settings

class GitHubService:
    def __init__(self):
        self.headers = {
            "Accept": "application/vnd.github.v3+json",
            "User-Agent": "CodeAI-Assistant",
        }
        token = settings.GITHUB_TOKEN.strip() if settings.GITHUB_TOKEN else ""
        if token:
            self.headers["Authorization"] = f"Bearer {token}"

    def extract_owner_repo(self, url: str) -> tuple[str, str]:
        # Handle formats like:
        # https://github.com/owner/repo.git
        # https://github.com/owner/repo
        # git@github.com:owner/repo.git
        clean_url = url.strip().rstrip('/')
        if clean_url.endswith('.git'):
            clean_url = clean_url[:-4]
            
        if ':' in clean_url and '@' in clean_url:
            # SSH format git@github.com:owner/repo
            path = clean_url.split(':')[-1]
            parts = path.split('/')
        else:
            parts = clean_url.split('/')
            
        if len(parts) >= 2:
            owner = parts[-2]
            repo = parts[-1]
            return owner, repo
            
        raise ValueError("Invalid GitHub URL. Expected format: https://github.com/owner/repository")

    def _get_headers(self, custom_token: str = None) -> dict:
        headers = self.headers.copy()
        if custom_token:
            headers["Authorization"] = f"Bearer {custom_token}"
        return headers

    async def get_repository_tree(self, owner: str, repo: str, token: str = None) -> List[Dict[str, Any]]:
        async with httpx.AsyncClient(timeout=30.0) as client:
            # 1. Fetch repo details to get default branch
            repo_url = f"https://api.github.com/repos/{owner}/{repo}"
            repo_resp = await client.get(repo_url, headers=self._get_headers(token))
            if repo_resp.status_code == 404:
                raise ValueError(f"Repository '{owner}/{repo}' not found. Make sure it's public or configure a GITHUB_TOKEN.")
            repo_resp.raise_for_status()
            default_branch = repo_resp.json().get("default_branch", "main")

            # 2. Get recursive tree
            tree_url = f"https://api.github.com/repos/{owner}/{repo}/git/trees/{default_branch}?recursive=1"
            tree_resp = await client.get(tree_url, headers=self._get_headers(token))
            tree_resp.raise_for_status()
            
            tree = tree_resp.json().get("tree", [])
            
            code_extensions = {
                '.py', '.js', '.ts', '.jsx', '.tsx', '.go', '.java', '.c', '.cpp', 
                '.h', '.hpp', '.cs', '.rb', '.php', '.md', '.json', '.yaml', '.yml',
                '.html', '.css', '.sql', '.sh'
            }
            
            ignored_folders = [
                'node_modules/', '.git/', 'dist/', 'build/', 'vendor/', 
                '__pycache__/', '.next/', '.venv/', 'venv/', 'env/'
            ]
            
            files = []
            for item in tree:
                if item["type"] == "blob":
                    path = item["path"]
                    if any(ignored in path for ignored in ignored_folders):
                        continue
                    ext = os.path.splitext(path)[1].lower()
                    if ext in code_extensions:
                        files.append({
                            "path": path,
                            "url": item["url"],
                            "sha": item["sha"],
                            "size": item.get("size", 0)
                        })
                        
            # Return top 50 relevant files to maintain fast response and avoid rate limits
            return files[:50]

    async def get_file_content(self, blob_url: str, token: str = None) -> str:
        async with httpx.AsyncClient(timeout=30.0) as client:
            resp = await client.get(blob_url, headers=self._get_headers(token))
            resp.raise_for_status()
            data = resp.json()
            content = data.get("content", "")
            encoding = data.get("encoding", "")
            if encoding == "base64":
                try:
                    return base64.b64decode(content).decode('utf-8')
                except UnicodeDecodeError:
                    return ""
            return content

github_service = GitHubService()
