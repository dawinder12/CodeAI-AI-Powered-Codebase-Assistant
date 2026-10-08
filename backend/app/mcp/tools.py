from langchain_core.tools import tool
from pydantic import BaseModel, Field
from app.rag.vector_store import vector_store

class SearchCodeSchema(BaseModel):
    query: str = Field(description="The semantic search query to find relevant code.")
    repo_id: str = Field(description="The repository ID to search within.")

@tool(args_schema=SearchCodeSchema)
def search_code(query: str, repo_id: str) -> str:
    """
    Search the codebase for relevant code snippets using semantic search.
    Use this when you need to find where something is implemented, or how a concept works.
    """
    results = vector_store.search(query, repo_id, top_k=4)
    if not results:
        return "No relevant code found."
    
    formatted_results = []
    for r in results:
        meta = r["metadata"]
        formatted_results.append(
            f"File: {meta['file_path']} (Lines {meta['start_line']}-{meta['end_line']})\n"
            f"```{meta['language']}\n{r['text']}\n```"
        )
    return "\n\n---\n\n".join(formatted_results)

# More MCP tools like read_file or list_files can be added here
