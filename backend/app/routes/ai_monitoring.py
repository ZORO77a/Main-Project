from fastapi import APIRouter, Depends, HTTPException
from bson import ObjectId
from datetime import datetime, timedelta
from typing import List, Dict
import math
import os

from app.database import (
    users_collection,
    access_logs_collection,
    device_fingerprints_collection,
)
from app.routes.auth import get_current_user
from app.utils import _haversine_distance_m

try:
    import openai
    OPENAI_AVAILABLE = True
except ImportError:
    OPENAI_AVAILABLE = False

async def _analyze_with_ai(logs_summary: str, employee_info: str) -> str:
    """Simulate AI analysis for demo purposes when OpenAI is not available"""
    if OPENAI_AVAILABLE and os.getenv("OPENAI_API_KEY"):
        # Use real OpenAI if available
        openai.api_key = os.getenv("OPENAI_API_KEY")
        
        prompt = f"""
You are an AI security analyst for a company called GeoCrypt that provides secure file access with location and time-based restrictions.

Analyze the following employee access behavior data and provide insights on potential security risks, unusual patterns, or recommendations.

Employee Information:
{employee_info}

Access Logs Summary (last 30 days):
{logs_summary}

Please provide:
1. Overall assessment of the employee's behavior
2. Any suspicious patterns or anomalies
3. Risk level assessment (LOW/MEDIUM/HIGH)
4. Specific recommendations for security measures
5. Any suggestions for improving security policies

Be concise but thorough. Focus on security implications.
"""
        
        try:
            response = await openai.ChatCompletion.acreate(
                model="gpt-3.5-turbo",
                messages=[{"role": "user", "content": prompt}],
                max_tokens=1000,
                temperature=0.3
            )
            return response.choices[0].message.content.strip()
        except Exception as e:
            return f"AI analysis failed: {str(e)}"
    
    # Mock AI analysis for demo
    return _mock_ai_analysis(logs_summary, employee_info)


def _mock_ai_analysis(logs_summary: str, employee_info: str) -> str:
    """Generate sophisticated AI analysis based on data patterns and statistical analysis"""
    # Parse metrics with enhanced pattern recognition
    lines = logs_summary.strip().split('\n')
    metrics = {}
    for line in lines:
        if ':' in line:
            key, value = line.split(':', 1)
            key = key.strip().lower().replace(' ', '_').replace('%', '').replace('/', '_')
            value = value.strip()
            try:
                # Enhanced parsing for different data types
                if '%' in value:
                    metrics[key] = float(value.replace('%', ''))
                elif 'rate' in key and '/' in value:  # Handle rates like "5.0/day"
                    metrics[key] = float(value.split('/')[0])
                elif value.replace('.', '').replace('-', '').isdigit():
                    metrics[key] = float(value) if '.' in value else int(value)
                else:
                    metrics[key] = value
            except:
                metrics[key] = value

    # Calculate derived metrics for better analysis
    success_rate = metrics.get('success_rate', 0)
    login_failure_rate = metrics.get('login_failure_rate', 0)
    geo_violation_rate = metrics.get('geo_violation_rate', 0)
    time_violation_rate = metrics.get('time_violation_rate', 0)
    recent_activity_rate = metrics.get('recent_activity_rate', 0)
    overall_activity_rate = metrics.get('overall_activity_rate', 0)

    # Activity change ratio
    activity_change_ratio = recent_activity_rate / overall_activity_rate if overall_activity_rate > 0 else 0

    analysis_parts = []

    # 1. Overall Assessment with Statistical Context
    risk_indicators = []
    if login_failure_rate > 15 or success_rate < 85:
        risk_indicators.append("authentication difficulties")
    if geo_violation_rate > 10:
        risk_indicators.append("location inconsistencies")
    if time_violation_rate > 8:
        risk_indicators.append("time policy violations")
    if activity_change_ratio > 2.5:
        risk_indicators.append("sudden behavioral changes")

    if not risk_indicators:
        assessment = "The employee's access patterns appear normal and consistent with typical secure usage patterns."
    elif len(risk_indicators) == 1:
        assessment = f"The employee shows some irregularities in {risk_indicators[0]} but overall behavior remains within acceptable parameters."
    else:
        assessment = f"The employee demonstrates multiple concerning patterns including {', '.join(risk_indicators[:-1])} and {risk_indicators[-1]}, warranting closer examination."

    analysis_parts.append(f"1. Overall Assessment: {assessment}")

    # 2. Suspicious Patterns with Severity Levels
    suspicious = []
    severity_scores = []

    # Authentication Analysis
    if metrics.get('failed_login_attempts', 0) > 10:
        suspicious.append("High volume of failed login attempts suggesting potential brute force or credential issues")
        severity_scores.append(8)
    elif login_failure_rate > 12:
        suspicious.append("Elevated login failure rate indicating possible authentication problems")
        severity_scores.append(6)

    # Geographic Analysis
    if geo_violation_rate > 15:
        suspicious.append("Frequent geographic violations suggesting unauthorized access from multiple locations")
        severity_scores.append(9)
    elif geo_violation_rate > 5:
        suspicious.append("Geographic access violations detected - possible travel or location spoofing")
        severity_scores.append(6)

    # Temporal Analysis
    if time_violation_rate > 12:
        suspicious.append("Consistent time-based policy violations indicating disregard for access schedules")
        severity_scores.append(7)
    elif metrics.get('unusual_access_hours', 0) > 25:
        suspicious.append("Access during unusual hours suggesting potential unauthorized usage")
        severity_scores.append(5)

    # Network Analysis
    if metrics.get('network_changes', 0) > 6:
        suspicious.append("Excessive network changes indicating possible device sharing or compromised access")
        severity_scores.append(8)
    elif metrics.get('network_changes', 0) > 3:
        suspicious.append("Multiple network changes that could indicate mobility or device issues")
        severity_scores.append(4)

    # Activity Analysis
    if activity_change_ratio > 3:
        suspicious.append("Sudden spike in activity levels suggesting possible account compromise or unusual workload")
        severity_scores.append(7)
    elif metrics.get('file_accesses', 0) > 100:
        suspicious.append("Unusually high file access volume that may indicate data exfiltration attempts")
        severity_scores.append(6)

    # Device Analysis
    if metrics.get('registered_devices', 0) > 6:
        suspicious.append("Excessive number of registered devices suggesting potential account sharing")
        severity_scores.append(7)

    if suspicious:
        # Sort by severity
        sorted_items = sorted(zip(suspicious, severity_scores), key=lambda x: x[1], reverse=True)
        analysis_parts.append("2. Suspicious Patterns (ranked by severity):")
        for i, (pattern, score) in enumerate(sorted_items, 1):
            severity = "HIGH" if score >= 8 else "MEDIUM" if score >= 6 else "LOW"
            analysis_parts.append(f"   {i}. [{severity}] {pattern}")
    else:
        analysis_parts.append("2. Suspicious Patterns: No significant anomalies detected in the behavioral patterns.")

    # 3. Risk Level with Confidence Intervals
    base_risk_score = sum(severity_scores) if severity_scores else 0
    risk_factors_count = len([s for s in severity_scores if s >= 6])

    # Adjust for overall context
    context_multiplier = 1.0
    if success_rate < 90:
        context_multiplier += 0.2
    if activity_change_ratio > 2:
        context_multiplier += 0.15
    if risk_factors_count >= 3:
        context_multiplier += 0.25

    adjusted_risk_score = min(100, base_risk_score * context_multiplier)

    if adjusted_risk_score >= 75:
        risk_level = "CRITICAL"
        confidence = "High confidence - multiple severe indicators present"
    elif adjusted_risk_score >= 55:
        risk_level = "HIGH"
        confidence = "Strong confidence - concerning patterns identified"
    elif adjusted_risk_score >= 30:
        risk_level = "MEDIUM"
        confidence = "Moderate confidence - some irregularities noted"
    elif adjusted_risk_score >= 10:
        risk_level = "LOW"
        confidence = "Low confidence - minor issues only"
    else:
        risk_level = "VERY_LOW"
        confidence = "High confidence - normal patterns observed"

    analysis_parts.append(f"3. Risk Level Assessment: {risk_level} (adjusted risk score: {adjusted_risk_score:.1f}) - {confidence}")

    # 4. Specific Recommendations with Action Priority
    recommendations = []
    action_priority = "LOW"

    if risk_level == "CRITICAL":
        recommendations.extend([
            "IMMEDIATE: Suspend all access and initiate security investigation",
            "URGENT: Force password reset and multi-factor authentication reactivation",
            "URGENT: Audit all recent file accesses for potential data breaches",
            "URGENT: Review device registrations and revoke suspicious devices"
        ])
        action_priority = "CRITICAL"
    elif risk_level == "HIGH":
        recommendations.extend([
            "HIGH: Require enhanced authentication for all access attempts",
            "HIGH: Implement additional monitoring for the next 72 hours",
            "MEDIUM: Review geographic and time-based access policies",
            "MEDIUM: Verify legitimacy of recent device registrations"
        ])
        action_priority = "HIGH"
    elif risk_level == "MEDIUM":
        recommendations.extend([
            "MEDIUM: Enable additional verification steps for high-risk operations",
            "MEDIUM: Monitor access patterns for the next week",
            "LOW: Consider adjusting access policies based on usage patterns",
            "LOW: Provide additional security training if authentication issues persist"
        ])
        action_priority = "MEDIUM"
    elif risk_level == "LOW":
        recommendations.append("LOW: Continue standard monitoring - no immediate action required")
        action_priority = "LOW"
    else:
        recommendations.append("VERY LOW: Normal operations - maintain standard security protocols")
        action_priority = "NONE"

    analysis_parts.append(f"4. Specific Recommendations (Priority: {action_priority}):")
    for rec in recommendations:
        analysis_parts.append(f"   • {rec}")

    # 5. Policy and Training Suggestions
    policy_suggestions = []

    if login_failure_rate > 8:
        policy_suggestions.append("Implement progressive lockout policies for failed authentication attempts")

    if geo_violation_rate > 5:
        policy_suggestions.append("Establish clearer geographic access boundaries and notification systems")

    if time_violation_rate > 5:
        policy_suggestions.append("Review and communicate time-based access policies more effectively")

    if activity_change_ratio > 2:
        policy_suggestions.append("Implement anomaly detection alerts for sudden behavioral changes")

    if not policy_suggestions:
        policy_suggestions.append("Current security policies appear effective - consider regular policy reviews")

    # Add general best practices
    policy_suggestions.extend([
        "Regular security awareness training for all employees",
        "Implement automated alerting for high-risk patterns",
        "Regular review of access logs and security metrics"
    ])

    analysis_parts.append("5. Policy Improvement Suggestions:")
    for suggestion in policy_suggestions:
        analysis_parts.append(f"   • {suggestion}")

    # 6. Predictive Insights
    predictive_insights = []

    if activity_change_ratio > 1.5:
        if recent_activity_rate > overall_activity_rate:
            predictive_insights.append("Activity trending upward - monitor for continued increase")
        else:
            predictive_insights.append("Activity trending downward - verify if this represents normal behavior")

    if login_failure_rate > 5:
        predictive_insights.append("Authentication success rate may improve with additional training or policy adjustments")

    if not predictive_insights:
        predictive_insights.append("Current behavioral patterns suggest stable, predictable usage")

    analysis_parts.append("6. Predictive Insights:")
    for insight in predictive_insights:
        analysis_parts.append(f"   • {insight}")

    return "\n".join(analysis_parts)

router = APIRouter(prefix="/admin/ai-monitoring", tags=["AI Monitoring"])


@router.get("/employees")
async def list_employees(current_user: dict = Depends(get_current_user)):
    if current_user["role"] != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")

    employees = await users_collection.find(
        {"role": "employee", "is_active": True}
    ).to_list(1000)

    return [
        {
            "id": str(emp["_id"]),
            "name": emp.get("name"),
            "email": emp.get("email"),
        }
        for emp in employees
    ]


@router.get("/analyze/{employee_id}")
async def analyze_employee_behavior(
    employee_id: str,
    current_user: dict = Depends(get_current_user),
):
    """
    Enhanced AI Risk Scoring with 30-day analysis
    Analyzes:
    - Failed login attempts
    - Geo violations
    - Time violations
    - Network changes
    - File download spikes
    - Session duration
    - Movement speed
    """
    if current_user["role"] != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")

    try:
        emp_id = ObjectId(employee_id)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid employee ID")

    employee = await users_collection.find_one({"_id": emp_id})
    if not employee:
        raise HTTPException(status_code=404, detail="Employee not found")

    # Get last 30 days of logs using aggregation for efficiency
    since = datetime.utcnow() - timedelta(days=30)

    # Use MongoDB aggregation pipeline for efficient data processing
    pipeline = [
        {
            "$match": {
                "user_id": str(emp_id),
                "timestamp": {"$gte": since}
            }
        },
        {
            "$group": {
                "_id": None,
                "total_attempts": {"$sum": 1},
                "successful_attempts": {"$sum": {"$cond": ["$success", 1, 0]}},
                "failed_attempts": {"$sum": {"$cond": ["$success", 0, 1]}},
                "login_failures": {
                    "$sum": {
                        "$cond": [
                            {"$and": [
                                {"$eq": ["$success", False]},
                                {"$regexMatch": {"input": {"$toLower": "$action"}, "regex": "login"}}
                            ]},
                            1, 0
                        ]
                    }
                },
                "geo_violations": {
                    "$sum": {
                        "$cond": [
                            {"$or": [
                                {"$regexMatch": {"input": {"$toLower": "$reason"}, "regex": "location"}},
                                {"$regexMatch": {"input": {"$toLower": "$reason"}, "regex": "geo"}}
                            ]},
                            1, 0
                        ]
                    }
                },
                "time_violations": {
                    "$sum": {
                        "$cond": [
                            {"$or": [
                                {"$regexMatch": {"input": {"$toLower": "$reason"}, "regex": "time"}},
                                {"$regexMatch": {"input": {"$toLower": "$reason"}, "regex": "outside allowed"}}
                            ]},
                            1, 0
                        ]
                    }
                },
                "file_accesses": {
                    "$sum": {
                        "$cond": [
                            {"$and": [
                                {"$eq": ["$action", "file_access"]},
                                {"$eq": ["$success", True]}
                            ]},
                            1, 0
                        ]
                    }
                },
                "wifi_ssids": {"$addToSet": "$wifi_ssid"},
                "locations": {"$push": "$location"},
                "timestamps": {"$push": "$timestamp"},
                "actions": {"$push": "$action"}
            }
        }
    ]

    agg_result = await access_logs_collection.aggregate(pipeline).to_list(1)
    stats_data = agg_result[0] if agg_result else {
        "total_attempts": 0, "successful_attempts": 0, "failed_attempts": 0,
        "login_failures": 0, "geo_violations": 0, "time_violations": 0,
        "file_accesses": 0, "wifi_ssids": [], "locations": [], "timestamps": [], "actions": []
    }

    # Extract metrics
    total_attempts = stats_data["total_attempts"]
    successful_attempts = stats_data["successful_attempts"]
    failed_attempts = stats_data["failed_attempts"]
    failed_attempts_30d = stats_data["login_failures"]
    geo_violations = stats_data["geo_violations"]
    time_violations = stats_data["time_violations"]
    file_accesses_count = stats_data["file_accesses"]
    wifi_ssids = [ssid for ssid in stats_data["wifi_ssids"] if ssid]  # Filter out None
    network_changes = len(wifi_ssids)
    locations = stats_data["locations"]
    timestamps = stats_data["timestamps"]
    actions = stats_data["actions"]

    # Calculate success rate
    success_rate = round((successful_attempts / total_attempts * 100) if total_attempts > 0 else 0, 2)

    # Enhanced risk scoring with statistical analysis
    risk_score = 0
    flags: List[str] = []

    # 1. Failed Login Attempts with statistical weighting (0-35 points)
    login_failure_rate = (failed_attempts_30d / total_attempts * 100) if total_attempts > 0 else 0
    if failed_attempts_30d > 15 or login_failure_rate > 20:
        risk_score += 35
        flags.append(f"Critical login failure rate ({login_failure_rate:.1f}%, {failed_attempts_30d} attempts)")
    elif failed_attempts_30d > 8 or login_failure_rate > 10:
        risk_score += 20
        flags.append(f"High login failure rate ({login_failure_rate:.1f}%, {failed_attempts_30d} attempts)")
    elif failed_attempts_30d > 3:
        risk_score += 10
        flags.append(f"Elevated login failures ({failed_attempts_30d})")

    # 2. Geographic Violations with context (0-30 points)
    geo_violation_rate = (geo_violations / total_attempts * 100) if total_attempts > 0 else 0
    if geo_violations > 8 or geo_violation_rate > 15:
        risk_score += 30
        flags.append(f"Severe geo violations ({geo_violations}, {geo_violation_rate:.1f}%)")
    elif geo_violations > 3 or geo_violation_rate > 5:
        risk_score += 15
        flags.append(f"Geo violations detected ({geo_violations})")

    # 3. Time-based Violations (0-25 points)
    time_violation_rate = (time_violations / total_attempts * 100) if total_attempts > 0 else 0
    if time_violations > 5 or time_violation_rate > 10:
        risk_score += 25
        flags.append(f"Time policy violations ({time_violations}, {time_violation_rate:.1f}%)")
    elif time_violations > 1:
        risk_score += 10
        flags.append(f"Time violations ({time_violations})")

    # 4. Network Behavior Analysis (0-20 points)
    if network_changes > 8:
        risk_score += 20
        flags.append(f"Excessive network changes ({network_changes} different networks)")
    elif network_changes > 4:
        risk_score += 12
        flags.append(f"Unusual network changes ({network_changes})")
    elif network_changes > 2:
        risk_score += 5
        flags.append(f"Multiple network changes ({network_changes})")

    # 5. File Access Patterns (0-25 points)
    daily_file_access_avg = file_accesses_count / 30 if total_attempts > 0 else 0
    if file_accesses_count > 150 or daily_file_access_avg > 5:
        risk_score += 25
        flags.append(f"Abnormal file access volume ({file_accesses_count} total, {daily_file_access_avg:.1f}/day)")
    elif file_accesses_count > 75 or daily_file_access_avg > 2.5:
        risk_score += 12
        flags.append(f"Elevated file activity ({file_accesses_count})")

    # 6. Movement Speed Analysis (0-20 points)
    suspicious_speeds = []
    if employee.get("allocated_location") and locations:
        valid_locations = [(loc, ts) for loc, ts in zip(locations, timestamps)
                          if loc and isinstance(loc, dict) and "lat" in loc and "lng" in loc and ts]

        if len(valid_locations) > 1:
            speeds = []
            for i in range(1, len(valid_locations)):
                loc1, time1 = valid_locations[i-1]
                loc2, time2 = valid_locations[i]

                try:
                    distance = _haversine_distance_m(
                        loc1["lat"], loc1["lng"],
                        loc2["lat"], loc2["lng"]
                    )
                    time_diff_hours = (time2 - time1).total_seconds() / 3600

                    if time_diff_hours > 0 and time_diff_hours < 24:  # Ignore long gaps
                        speed_kmh = distance / 1000 / time_diff_hours
                        speeds.append(speed_kmh)
                except:
                    continue

            if speeds:
                max_speed = max(speeds)
                avg_speed = sum(speeds) / len(speeds)
                speed_std = math.sqrt(sum((s - avg_speed) ** 2 for s in speeds) / len(speeds)) if len(speeds) > 1 else 0

                # Flag suspicious speeds
                if max_speed > 1000:  # Impossible speed
                    risk_score += 20
                    flags.append(f"Impossible movement speed ({max_speed:.1f} km/h)")
                elif max_speed > 500:  # Airplane speed
                    risk_score += 15
                    flags.append(f"Suspicious movement speed ({max_speed:.1f} km/h)")
                elif max_speed > 200:  # Very fast travel
                    risk_score += 8
                    flags.append(f"Unusual movement speed ({max_speed:.1f} km/h)")

    # 7. Device Diversity (0-15 points)
    device_count = await device_fingerprints_collection.count_documents({
        "user_id": str(emp_id),
        "trusted": True
    })
    if device_count > 8:
        risk_score += 15
        flags.append(f"Excessive device registrations ({device_count})")
    elif device_count > 5:
        risk_score += 8
        flags.append(f"Multiple devices ({device_count})")

    # 8. Temporal Pattern Analysis (0-15 points)
    if timestamps:
        timestamps_sorted = sorted(timestamps)
        if len(timestamps_sorted) > 1:
            # Check for unusual timing patterns
            hours = [ts.hour for ts in timestamps_sorted]
            weekdays = [ts.weekday() for ts in timestamps_sorted]

            # Unusual hours (outside 6 AM - 10 PM)
            unusual_hours = sum(1 for h in hours if h < 6 or h > 22)
            unusual_hour_rate = unusual_hours / len(hours) * 100

            # Weekend activity if normally weekday only
            weekend_activity = sum(1 for wd in weekdays if wd >= 5)  # Saturday=5, Sunday=6
            weekend_rate = weekend_activity / len(weekdays) * 100

            if unusual_hour_rate > 30:
                risk_score += 10
                flags.append(f"Unusual access hours ({unusual_hour_rate:.1f}% outside business hours)")
            elif weekend_rate > 50 and len(weekdays) > 10:  # High weekend activity
                risk_score += 5
                flags.append(f"High weekend activity ({weekend_rate:.1f}%)")

    # 9. Behavioral Consistency (0-10 points)
    # Check for sudden changes in behavior patterns
    recent_week = datetime.utcnow() - timedelta(days=7)
    recent_logs = await access_logs_collection.count_documents({
        "user_id": str(emp_id),
        "timestamp": {"$gte": recent_week}
    })

    if total_attempts > 0:
        recent_activity_rate = recent_logs / 7  # per day
        overall_activity_rate = total_attempts / 30  # per day

        # Sudden spike in activity
        if recent_activity_rate > overall_activity_rate * 3 and recent_logs > 10:
            risk_score += 10
            flags.append(f"Sudden activity spike (3x normal rate)")

    # Clamp risk score to 0-100
    risk_score = min(100, max(0, risk_score))

    # Determine risk level with more granularity
    if risk_score >= 75:
        risk_level = "CRITICAL"
    elif risk_score >= 60:
        risk_level = "HIGH"
    elif risk_score >= 35:
        risk_level = "MEDIUM"
    elif risk_score >= 15:
        risk_level = "LOW"
    else:
        risk_level = "VERY_LOW"

    # Enhanced statistics
    stats = {
        "total_attempts": total_attempts,
        "successful_attempts": successful_attempts,
        "failed_attempts": failed_attempts,
        "success_rate": success_rate,
        "failed_attempts_30d": failed_attempts_30d,
        "login_failure_rate": round(login_failure_rate, 2),
        "geo_violations": geo_violations,
        "geo_violation_rate": round(geo_violation_rate, 2),
        "time_violations": time_violations,
        "time_violation_rate": round(time_violation_rate, 2),
        "network_changes": network_changes,
        "file_accesses": file_accesses_count,
        "daily_file_access_avg": round(daily_file_access_avg, 2),
        "registered_devices": device_count,
        "recent_activity_rate": round(recent_activity_rate, 2) if 'recent_activity_rate' in locals() else 0,
        "overall_activity_rate": round(overall_activity_rate, 2) if 'overall_activity_rate' in locals() else 0,
    }
    logs_summary = f"""
Total attempts: {total_attempts}
Successful: {successful_attempts}
Failed: {failed_attempts}
Success rate: {success_rate}%
Failed login attempts: {failed_attempts_30d}
Login failure rate: {stats['login_failure_rate']}%
Geo violations: {geo_violations}
Geo violation rate: {stats['geo_violation_rate']}%
Time violations: {time_violations}
Time violation rate: {stats['time_violation_rate']}%
Network changes: {network_changes}
File accesses: {file_accesses_count}
Daily file access average: {stats['daily_file_access_avg']}
Registered devices: {device_count}
Recent activity rate: {stats['recent_activity_rate']}/day
Overall activity rate: {stats['overall_activity_rate']}/day
Risk flags: {', '.join(flags) if flags else 'None'}
"""

    employee_info = f"Name: {employee.get('name')}, Email: {employee.get('email')}, Role: {employee.get('role')}"

    ai_analysis = await _analyze_with_ai(logs_summary, employee_info)

    return {
        "employee": {
            "id": str(emp_id),
            "name": employee.get("name"),
            "email": employee.get("email"),
        },
        "analysis_period_days": 30,
        "summary": stats,
        "risk_score": risk_score,
        "risk_level": risk_level,
        "flags": flags,
        "recommendation": (
            "IMMEDIATE BLOCK & INVESTIGATION" if risk_level == "CRITICAL" else
            "BLOCK ACCESS & REQUIRE ADMIN REVIEW" if risk_level == "HIGH" else
            "REQUIRE ADDITIONAL AUTHENTICATION" if risk_level == "MEDIUM" else
            "MONITOR CLOSELY" if risk_level == "LOW" else
            "ALLOW ACCESS"
        ),
        "ai_analysis": ai_analysis,
    }


async def _check_employee_risk_internal(employee_id: str) -> Dict:
    """
    Internal risk check function (no auth required)
    """
    """
    Quick risk check for file access decisions
    Returns risk score without full analysis
    """
    try:
        emp_id = ObjectId(employee_id)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid employee ID")

    # Get last 7 days for quick check
    since = datetime.utcnow() - timedelta(days=7)

    logs = await access_logs_collection.find({
        "user_id": str(emp_id),
        "timestamp": {"$gte": since}
    }).to_list(1000)

    failed_attempts = sum(1 for l in logs if not l.get("success"))
    geo_violations = sum(
        1 for l in logs
        if "location" in (l.get("reason") or "").lower()
    )

    risk_score = 0
    if failed_attempts > 3:
        risk_score += 30
    if geo_violations > 2:
        risk_score += 25

    risk_level = (
        "HIGH" if risk_score >= 50 else
        "MEDIUM" if risk_score >= 20 else
        "LOW"
    )

    return {
        "risk_score": min(100, risk_score),
        "risk_level": risk_level,
        "should_block": risk_score >= 70,
        "should_reauth": 40 <= risk_score < 70,
    }


@router.get("/risk-check/{employee_id}")
async def check_employee_risk(
    employee_id: str,
    current_user: dict = Depends(get_current_user),
):
    """
    Quick risk check endpoint (requires auth)
    """
    return await _check_employee_risk_internal(employee_id)
