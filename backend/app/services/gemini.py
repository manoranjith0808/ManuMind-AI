"""Google Gemini AI service for manufacturing intelligence.

Provides structured AI responses for:
- Production schedule generation
- Dynamic rescheduling after machine failures
- Manufacturing insights generation
- Conversational manufacturing copilot
"""
import json
import logging
from datetime import datetime
import google.generativeai as genai
from app.config import settings

logger = logging.getLogger(__name__)

if settings.GEMINI_API_KEY:
    genai.configure(api_key=settings.GEMINI_API_KEY)
MODEL_NAME = "gemini-3.5-flash"


def _get_model():
    if not settings.GEMINI_API_KEY:
        raise RuntimeError("GEMINI_API_KEY is not configured")
    return genai.GenerativeModel(MODEL_NAME)


async def generate_schedule(params: dict) -> dict:
    """Generate an optimal production schedule using Gemini AI.
    
    Args:
        params: Dict with production_target, product_type, delivery_deadline,
                machine_ids, machine_capacities, shift_timings, maintenance_windows
    
    Returns:
        Dict with schedule_items, summary, and ai_reasoning
    """
    try:
        model = _get_model()
        prompt = f"""You are an expert manufacturing production scheduler and operations research specialist.

TASK: Generate an optimal production schedule that minimizes completion time while maximizing machine utilization.

INPUTS:
- Production Target: {params.get('production_target')} units of {params.get('product_type')}
- Delivery Deadline: {params.get('delivery_deadline')}
- Available Machines: {json.dumps(params.get('machine_ids', []))}
- Machine Capacities (units/hour): {json.dumps(params.get('machine_capacities', {{}}))}
- Shift Timings: {json.dumps(params.get('shift_timings', {{}}))}
- Maintenance Windows: {json.dumps(params.get('maintenance_windows', []))}

SCHEDULING RULES:
1. Assign work to machines based on their capacity - higher capacity machines get more work
2. Respect shift timings - machines only operate during active shifts
3. Avoid maintenance windows - no production during scheduled maintenance
4. Balance the load across machines to minimize idle time
5. Prioritize meeting the delivery deadline

Return a JSON object with this EXACT structure (no markdown, no code blocks, ONLY valid JSON):
{{
    "schedule_items": [
        {{
            "id": "task_1",
            "machine_id": "M101",
            "product_type": "Product_A",
            "start_time": "2024-01-15T06:00:00",
            "end_time": "2024-01-15T14:00:00",
            "quantity": 500,
            "utilization_pct": 85.5
        }}
    ],
    "summary": {{
        "total_production": 5000,
        "estimated_completion": "2024-01-15T22:00:00",
        "machines_used": 6,
        "avg_utilization": 82.3,
        "meets_deadline": true
    }},
    "ai_reasoning": "Detailed explanation of why this schedule is optimal..."
}}"""

        response = model.generate_content(prompt)
        text = response.text.strip()
        # Clean markdown code block wrappers if present
        if text.startswith("```json"):
            text = text[7:]
        if text.startswith("```"):
            text = text[3:]
        if text.endswith("```"):
            text = text[:-3]
        return json.loads(text.strip())
    except json.JSONDecodeError as e:
        logger.error(f"Failed to parse Gemini schedule response: {e}")
        return _fallback_schedule(params)
    except Exception as e:
        logger.error(f"Error generating schedule: {e}")
        return _fallback_schedule(params)


def _fallback_schedule(params: dict) -> dict:
    """Generate a basic fallback schedule when Gemini is unavailable."""
    machine_ids = params.get('machine_ids', ['M101', 'M102', 'M103'])
    target = params.get('production_target', 1000)
    per_machine = target // len(machine_ids)
    deadline = params.get('delivery_deadline', datetime.utcnow().isoformat())
    
    items = []
    for i, mid in enumerate(machine_ids):
        items.append({
            "id": f"task_{i+1}",
            "machine_id": mid,
            "product_type": params.get('product_type', 'Product_A'),
            "start_time": datetime.utcnow().replace(hour=6, minute=0, second=0).isoformat(),
            "end_time": datetime.utcnow().replace(hour=14, minute=0, second=0).isoformat(),
            "quantity": per_machine,
            "utilization_pct": round((per_machine / max(target, 1)) * 100 * len(machine_ids), 1)
        })
    
    return {
        "schedule_items": items,
        "summary": {
            "total_production": target,
            "estimated_completion": deadline,
            "machines_used": len(machine_ids),
            "avg_utilization": 75.0,
            "meets_deadline": True
        },
        "ai_reasoning": "Fallback schedule generated. AI service was temporarily unavailable. Work has been evenly distributed across available machines."
    }


async def reschedule_production(current_schedule: dict, failed_machine: str, failure_time: str) -> dict:
    """Reschedule production after a machine failure.
    
    Args:
        current_schedule: The current active schedule data
        failed_machine: Machine ID that failed (e.g., 'M103')
        failure_time: ISO timestamp of when the failure occurred
    
    Returns:
        Dict with new_schedule, delay_analysis, production_impact, and ai_reasoning
    """
    try:
        model = _get_model()
        prompt = f"""You are an expert manufacturing production scheduler handling an EMERGENCY MACHINE FAILURE.

SITUATION: Machine {failed_machine} has failed at {failure_time}. You must redistribute its remaining work.

CURRENT SCHEDULE:
{json.dumps(current_schedule, indent=2)}

FAILED MACHINE: {failed_machine}
FAILURE TIME: {failure_time}

RESCHEDULING RULES:
1. Remove ALL tasks from {failed_machine} that haven't started yet (after failure time)
2. Redistribute those tasks among remaining operational machines
3. Consider existing load on other machines - don't overload them
4. Minimize the total delay to the delivery deadline
5. Prioritize high-volume tasks first
6. Account for machine capacity differences

Return a JSON object with this EXACT structure (no markdown, ONLY valid JSON):
{{
    "new_schedule": [
        {{
            "id": "task_1",
            "machine_id": "M101",
            "product_type": "Product_A",
            "start_time": "2024-01-15T06:00:00",
            "end_time": "2024-01-15T16:00:00",
            "quantity": 600,
            "utilization_pct": 92.0,
            "was_redistributed": false
        }}
    ],
    "delay_analysis": {{
        "expected_delay_hours": 2.5,
        "affected_products": 3,
        "redistributed_tasks": 4,
        "new_completion_time": "2024-01-16T02:00:00",
        "original_completion_time": "2024-01-15T22:00:00"
    }},
    "production_impact": {{
        "lost_capacity_units": 500,
        "recovered_capacity_units": 450,
        "net_impact_units": -50
    }},
    "change_log": [
        {{
            "task_id": "task_3",
            "from_machine": "M103",
            "to_machine": "M101",
            "quantity": 200,
            "reason": "M101 had available capacity"
        }}
    ],
    "ai_reasoning": "Detailed explanation of the rescheduling strategy..."
}}"""

        response = model.generate_content(prompt)
        text = response.text.strip()
        if text.startswith("```json"):
            text = text[7:]
        if text.startswith("```"):
            text = text[3:]
        if text.endswith("```"):
            text = text[:-3]
        return json.loads(text.strip())
    except Exception as e:
        logger.error(f"Error rescheduling: {e}")
        return {
            "new_schedule": [],
            "delay_analysis": {
                "expected_delay_hours": 0,
                "affected_products": 0,
                "redistributed_tasks": 0,
                "new_completion_time": failure_time,
                "original_completion_time": failure_time
            },
            "production_impact": {"lost_capacity_units": 0, "recovered_capacity_units": 0, "net_impact_units": 0},
            "change_log": [],
            "ai_reasoning": f"Error rescheduling after {failed_machine} failure. Please try again."
        }


async def generate_insights(kpi_data: dict) -> list[dict]:
    """Generate AI-powered manufacturing insights from KPI data.
    
    Args:
        kpi_data: Dict containing current manufacturing KPIs
    
    Returns:
        List of insight dicts with category, priority, title, description, action_items
    """
    try:
        model = _get_model()
        prompt = f"""You are a senior manufacturing consultant analyzing factory performance data.

CURRENT MANUFACTURING KPIs:
{json.dumps(kpi_data, indent=2)}

Analyze this data and generate 5-7 actionable manufacturing insights. For each insight:

CATEGORIES to choose from: production, quality, energy, maintenance, scheduling
PRIORITIES: high (urgent, immediate action needed), medium (should address soon), low (optimization opportunity)

Focus on:
- Root cause analysis of any underperformance
- Predictive maintenance recommendations based on sensor trends
- Energy efficiency opportunities  
- Quality improvement suggestions
- Production bottleneck identification
- Shift-wise performance gaps
- Machine utilization optimization

Return ONLY a JSON array (no markdown, no code blocks):
[
    {{
        "category": "production",
        "priority": "high",
        "title": "Production Bottleneck Detected on Machine M103",
        "description": "Machine M103 is operating at only 62% utilization while having the highest capacity. This indicates a potential scheduling or material supply issue.",
        "action_items": [
            "Investigate material supply chain for M103",
            "Review scheduling algorithm for optimal M103 allocation",
            "Check for operator training gaps on M103"
        ],
        "data_evidence": {{
            "machine": "M103",
            "current_utilization": 62,
            "expected_utilization": 85,
            "impact": "~230 units/day lost production"
        }}
    }}
]"""

        response = model.generate_content(prompt)
        text = response.text.strip()
        if text.startswith("```json"):
            text = text[7:]
        if text.startswith("```"):
            text = text[3:]
        if text.endswith("```"):
            text = text[:-3]
        result = json.loads(text.strip())
        if isinstance(result, list):
            return result
        return []
    except Exception as e:
        logger.error(f"Error generating insights: {e}")
        error_msg = str(e).lower()
        if "quota" in error_msg or "429" in error_msg:
            description = "The Google Gemini API quota has been exceeded. Please configure a new API key in the `.env` file."
        else:
            description = f"The AI insight engine encountered an error: {e}"
            
        return [{
            "category": "production",
            "priority": "high",
            "title": "⚠️ AI Engine Error",
            "description": description,
            "action_items": ["Check API Key configuration", "Check rate limits"],
            "data_evidence": {}
        }]


async def chat_response(message: str, history: list, context_data: dict) -> str:
    """Generate a conversational response as a manufacturing AI copilot.
    
    Args:
        message: User's question
        history: Previous conversation messages [{role, content}]
        context_data: Current dashboard metrics for context
    
    Returns:
        AI response string (supports markdown formatting)
    """
    try:
        model = _get_model()
        history_text = "\n".join([f"{msg['role'].upper()}: {msg['content']}" for msg in history[-10:]])  # Last 10 messages
        
        prompt = f"""You are **ManuMind AI**, an intelligent manufacturing operations assistant. You help factory managers make data-driven decisions.

CURRENT FACTORY STATUS (Live Data):
{json.dumps(context_data, indent=2)}

CONVERSATION HISTORY:
{history_text}

USER QUESTION: {message}

GUIDELINES:
- Answer based on the provided factory data whenever possible
- Use specific numbers and metrics from the data
- If asked to predict, use trends from the data to make reasonable projections
- Format responses with markdown for readability (bold, bullet points, headers)
- Be concise but thorough
- If you don't have enough data for a definitive answer, say so and suggest what data would help
- Always end with a specific actionable recommendation when relevant

Respond as ManuMind AI:"""

        response = model.generate_content(prompt)
        return response.text
    except Exception as e:
        logger.error(f"Error in chat: {e}")
        error_msg = str(e).lower()
        if "quota" in error_msg or "429" in error_msg:
            return "⚠️ **AI Engine Error**: The Google Gemini API quota has been exceeded for the provided API Key. Please provide a new API Key in the `.env` file or wait for the rate limit to reset."
        
        return f"⚠️ **AI Engine Error**: Could not connect to the Google Gemini AI. Detail: {e}"
