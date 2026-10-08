import os
from typing import List, Dict, Any

class CodeChunker:
    """
    Abstract representation for chunking code.
    Currently uses Langchain's text splitters but designed to be replaced 
    with AST-based chunking in the future.
    """
    def __init__(self, chunk_size: int = 1000, chunk_overlap: int = 200):
        from langchain_text_splitters import RecursiveCharacterTextSplitter, Language
        
        self.chunk_size = chunk_size
        self.chunk_overlap = chunk_overlap
        
        # Mapping file extensions to Langchain Language enum
        self.ext_to_lang = {
            '.py': Language.PYTHON,
            '.js': Language.JS,
            '.ts': Language.TS,
            '.go': Language.GO,
            '.java': Language.JAVA,
            '.cpp': Language.CPP,
            '.rb': Language.RUBY,
            '.php': Language.PHP,
            '.html': Language.HTML,
            '.md': Language.MARKDOWN,
        }
        
        self.default_splitter = RecursiveCharacterTextSplitter(
            chunk_size=self.chunk_size, 
            chunk_overlap=self.chunk_overlap
        )

    def chunk_file(self, content: str, file_path: str, repo_id: str) -> List[Dict[str, Any]]:
        ext = os.path.splitext(file_path)[1].lower()
        
        if ext in self.ext_to_lang:
            lang = self.ext_to_lang[ext]
            from langchain_text_splitters import RecursiveCharacterTextSplitter
            splitter = RecursiveCharacterTextSplitter.from_language(
                language=lang, 
                chunk_size=self.chunk_size, 
                chunk_overlap=self.chunk_overlap
            )
        else:
            splitter = self.default_splitter
            
        chunks = []
        # Compute line numbers for chunks
        # Langchain doesn't give line numbers out of the box natively with simple splitters,
        # but we can estimate them by finding the chunk in the original text.
        split_texts = splitter.split_text(content)
        
        current_idx = 0
        for text in split_texts:
            start_idx = content.find(text, current_idx)
            if start_idx == -1:
                start_idx = current_idx
            
            # Count newlines up to start_idx to get start_line
            start_line = content.count('\n', 0, start_idx) + 1
            end_line = start_line + text.count('\n')
            
            chunks.append({
                "text": text,
                "metadata": {
                    "repo_id": repo_id,
                    "file_path": file_path,
                    "start_line": start_line,
                    "end_line": end_line,
                    "language": ext.replace('.', '')
                }
            })
            current_idx = start_idx + len(text) - self.chunk_overlap
            if current_idx < 0:
                current_idx = 0
                
        return chunks

chunker = CodeChunker()
