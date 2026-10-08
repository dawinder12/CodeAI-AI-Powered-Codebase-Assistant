import os
from typing import Annotated, Sequence, TypedDict
from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_core.messages import BaseMessage, HumanMessage, SystemMessage
from langgraph.graph import StateGraph, END
from langgraph.prebuilt import ToolNode
from app.mcp.tools import search_code
from app.config import settings
import operator

class AgentState(TypedDict):
    messages: Annotated[Sequence[BaseMessage], operator.add]
    repo_id: str

tools = [search_code]

def get_llm(model_name: str = "gemini-flash-lite-latest"):
    api_key = settings.LLM_API_KEY or os.environ.get("GOOGLE_API_KEY") or os.environ.get("GEMINI_API_KEY")
    if not api_key:
        raise ValueError("LLM_API_KEY is not set. Please set it in backend/.env")
    return ChatGoogleGenerativeAI(
        model=model_name,
        google_api_key=api_key,
        temperature=0.2
    )

def should_continue(state: AgentState):
    messages = state['messages']
    last_message = messages[-1]
    if hasattr(last_message, 'tool_calls') and last_message.tool_calls:
        return "continue"
    return "end"

def call_model(state: AgentState):
    candidate_models = ["gemini-flash-lite-latest", "gemini-3.5-flash-lite", "gemini-3.1-flash-lite"]
    last_err = None
    messages = state['messages']
    
    for m in candidate_models:
        try:
            llm = get_llm(model_name=m)
            llm_with_tools = llm.bind_tools(tools)
            response = llm_with_tools.invoke(messages)
            return {"messages": [response]}
        except Exception as e:
            last_err = e
            continue
            
    raise last_err

workflow = StateGraph(AgentState)
workflow.add_node("agent", call_model)
tool_node = ToolNode(tools)
workflow.add_node("action", tool_node)

workflow.set_entry_point("agent")
workflow.add_conditional_edges(
    "agent",
    should_continue,
    {
        "continue": "action",
        "end": END
    }
)
workflow.add_edge("action", "agent")

app_agent = workflow.compile()

def run_agent(query: str, repo_id: str) -> str:
    system_prompt = (
        f"You are CodeAI, an elite AI codebase intelligence assistant.\n"
        f"You are helping the user understand and navigate repository: '{repo_id}'.\n"
        f"You have access to the `search_code` tool to retrieve relevant code snippets from the codebase.\n"
        f"Always use the `search_code` tool with query and repo_id='{repo_id}' when the user asks about how the code works, specific features, architecture, or files.\n"
        f"Structure your explanations cleanly, referencing the exact files and lines when possible.\n"
        f"Be direct, accurate, and concise."
    )
    inputs = {
        "messages": [
            SystemMessage(content=system_prompt),
            HumanMessage(content=query)
        ],
        "repo_id": repo_id
    }
    result = app_agent.invoke(inputs)
    raw_content = result["messages"][-1].content
    if isinstance(raw_content, list):
        text_parts = []
        for part in raw_content:
            if isinstance(part, dict) and "text" in part:
                text_parts.append(part["text"])
            elif isinstance(part, str):
                text_parts.append(part)
        return "\n\n".join(text_parts) if text_parts else str(raw_content)
    return str(raw_content)
