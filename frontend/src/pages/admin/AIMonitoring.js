import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Users,
  AlertTriangle,
  Shield,
} from 'lucide-react';
import { adminAPI, aiAPI } from '../../services/api';
import toast from 'react-hot-toast';

export default function AIMonitoring() {
  const [employees, setEmployees] = useState([]);
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [analysis, setAnalysis] = useState(null);
  const [loading, setLoading] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    fetchEmployees();
  }, []);

  /* ---------------- FETCH EMPLOYEES ---------------- */

  const fetchEmployees = async () => {
    try {
      setLoading(true);
      const response = await adminAPI.getEmployees();
      setEmployees(response.data || []);
    } catch (error) {
      toast.error('Failed to load employees');
    } finally {
      setLoading(false);
    }
  };

  /* ---------------- ANALYZE EMPLOYEE ---------------- */

  const analyzeEmployee = async (employeeId) => {
    try {
      setAnalyzing(true);
      setSelectedEmployee(employeeId);

      const response = await aiAPI.analyzeEmployee(employeeId);
      setAnalysis(response.data);

      toast.success('Analysis completed');
    } catch (error) {
      toast.error('Failed to analyze employee behavior');
    } finally {
      setAnalyzing(false);
    }
  };

  /* ---------------- DERIVED SAFE DATA ---------------- */

  const derivedAnalysis = analysis && {
    risk_level: analysis.risk_level || 'LOW',
    risk_score: analysis.risk_score || 0,

    total_accesses: analysis.summary?.total_attempts || 0,

    success_rate: analysis.summary?.total_attempts
      ? Math.round(
          (analysis.summary.successful_attempts /
            analysis.summary.total_attempts) *
            100
        )
      : 0,

    unusual_patterns: analysis.flags || [],

    recommendations:
      analysis.flags && analysis.flags.length > 0
        ? ['Review employee behavior and tighten access rules']
        : ['No action required'],

    analysis_period: 'Last 30 days',
    ai_analysis: analysis.ai_analysis || 'AI analysis not available',
  };

  return (
    <div className="space-y-8">
      {/* HEADER */}
      <div className="bg-gradient-to-r from-red-600 to-purple-600 rounded-xl p-8 text-white">
        <button
          onClick={() => navigate('/admin')}
          className="flex items-center text-red-100 hover:text-white mb-4"
        >
          <ArrowLeft className="w-5 h-5 mr-2" />
          Back to Dashboard
        </button>
        <h1 className="text-4xl font-bold mb-2">AI Behavior Analysis</h1>
        <p className="text-red-100">
          Advanced employee monitoring and security insights
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* EMPLOYEE LIST */}
        <div className="bg-white rounded-xl shadow-lg p-6">
          <h3 className="text-2xl font-bold mb-6 flex items-center">
            <Users className="w-6 h-6 mr-3 text-blue-600" />
            Select Employee
          </h3>

          {loading ? (
            <div className="flex justify-center py-6">
              <div className="animate-spin h-8 w-8 border-b-2 border-blue-600 rounded-full" />
            </div>
          ) : (
            employees.map((emp) => (
              <button
                key={emp.id}
                onClick={() => analyzeEmployee(emp.id)}
                disabled={analyzing}
                className={`w-full p-4 mb-3 rounded-lg border text-left transition ${
                  selectedEmployee === emp.id
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-200 hover:bg-gray-50'
                }`}
              >
                <p className="font-semibold">{emp.name}</p>
                <p className="text-sm text-gray-600">{emp.email}</p>
              </button>
            ))
          )}
        </div>

        {/* ANALYSIS RESULT */}
        <div className="bg-white rounded-xl shadow-lg p-6">
          <h3 className="text-2xl font-bold mb-6 flex items-center">
            <Shield className="w-6 h-6 mr-3 text-green-600" />
            Analysis Result
          </h3>

          {!derivedAnalysis ? (
            <div className="text-center py-12 text-gray-500">
              Select an employee to analyze
            </div>
          ) : (
            <div className="space-y-6">
              {/* RISK LEVEL */}
              <div
                className={`p-4 rounded-lg border ${
                  derivedAnalysis.risk_level === 'HIGH'
                    ? 'bg-red-50 border-red-200'
                    : derivedAnalysis.risk_level === 'MEDIUM'
                    ? 'bg-yellow-50 border-yellow-200'
                    : 'bg-green-50 border-green-200'
                }`}
              >
                <div className="flex justify-between items-center">
                  <div>
                    <p className="text-sm text-gray-600">Risk Level</p>
                    <p className="text-2xl font-bold">
                      {derivedAnalysis.risk_level}
                    </p>
                  </div>
                  <AlertTriangle className="w-8 h-8" />
                </div>
              </div>

              {/* STATS */}
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-gray-50 p-4 rounded-lg">
                  <p className="text-sm text-gray-600">Total Accesses</p>
                  <p className="text-2xl font-bold">
                    {derivedAnalysis.total_accesses}
                  </p>
                </div>

                <div className="bg-gray-50 p-4 rounded-lg">
                  <p className="text-sm text-gray-600">Success Rate</p>
                  <p className="text-2xl font-bold">
                    {derivedAnalysis.success_rate}%
                  </p>
                </div>
              </div>

              {/* FLAGS */}
              {derivedAnalysis.unusual_patterns.length > 0 && (
                <div className="bg-yellow-50 border border-yellow-200 p-4 rounded-lg">
                  <h4 className="font-semibold mb-2">Unusual Patterns</h4>
                  <ul className="list-disc ml-5 text-sm">
                    {derivedAnalysis.unusual_patterns.map((f, i) => (
                      <li key={i}>{f}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* RECOMMENDATIONS */}
              <div className="bg-blue-50 border border-blue-200 p-4 rounded-lg">
                <h4 className="font-semibold mb-2">Recommendations</h4>
                <ul className="list-disc ml-5 text-sm">
                  {derivedAnalysis.recommendations.map((r, i) => (
                    <li key={i}>{r}</li>
                  ))}
                </ul>
              </div>

              {/* AI ANALYSIS */}
              <div className="bg-purple-50 border border-purple-200 p-4 rounded-lg">
                <h4 className="font-semibold mb-2">AI-Powered Analysis</h4>
                <p className="text-sm whitespace-pre-line">{derivedAnalysis.ai_analysis}</p>
              </div>

              <p className="text-center text-sm text-gray-500">
                Analysis Period: {derivedAnalysis.analysis_period}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
