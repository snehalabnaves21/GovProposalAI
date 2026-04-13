import { useState, useMemo } from 'react';
import {
  TrophyIcon,
  ChartBarIcon,
  LightBulbIcon,
  ShieldCheckIcon,
  CurrencyDollarIcon,
  UserGroupIcon,
  SparklesIcon,
  ArrowTrendingUpIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
} from '@heroicons/react/24/outline';
import api from '../services/api';

const SCORING_FACTORS = [
  {
    id: 'past_performance',
    label: 'Past Performance Match',
    description: 'Relevant past contracts with similar scope, size, and agency',
    weight: 25,
    icon: TrophyIcon,
  },
  {
    id: 'pricing',
    label: 'Pricing Competitiveness',
    description: 'Your pricing relative to government estimates and competitors',
    weight: 20,
    icon: CurrencyDollarIcon,
  },
  {
    id: 'capability',
    label: 'Capability & Technical Match',
    description: 'Technical approach alignment with RFP requirements',
    weight: 25,
    icon: ShieldCheckIcon,
  },
  {
    id: 'setaside',
    label: 'Set-Aside Eligibility',
    description: '8(a), WOSB, HUBZone, SDVOSB, or other set-aside match',
    weight: 15,
    icon: UserGroupIcon,
  },
  {
    id: 'compliance',
    label: 'Compliance Completeness',
    description: 'How well your proposal addresses all mandatory requirements',
    weight: 15,
    icon: CheckCircleIcon,
  },
];

const SCORE_LEVELS = [
  { min: 0, max: 2, label: 'None', color: 'bg-red-500' },
  { min: 3, max: 4, label: 'Low', color: 'bg-orange-500' },
  { min: 5, max: 6, label: 'Moderate', color: 'bg-amber-500' },
  { min: 7, max: 8, label: 'Strong', color: 'bg-green-500' },
  { min: 9, max: 10, label: 'Excellent', color: 'bg-emerald-600' },
];

export default function WinProbability() {
  const [scores, setScores] = useState(
    Object.fromEntries(SCORING_FACTORS.map(f => [f.id, 5]))
  );
  const [details, setDetails] = useState(
    Object.fromEntries(SCORING_FACTORS.map(f => [f.id, '']))
  );
  const [opportunityTitle, setOpportunityTitle] = useState('');
  const [agency, setAgency] = useState('');
  const [contractValue, setContractValue] = useState('');
  const [generating, setGenerating] = useState(false);
  const [strategy, setStrategy] = useState(null);

  const winProbability = useMemo(() => {
    let total = 0;
    let weightSum = 0;
    SCORING_FACTORS.forEach(f => {
      total += (scores[f.id] / 10) * f.weight;
      weightSum += f.weight;
    });
    return Math.round((total / weightSum) * 100);
  }, [scores]);

  const getColor = (pct) => {
    if (pct >= 75) return { text: 'text-emerald-600', bg: 'bg-emerald-500', ring: 'ring-emerald-200' };
    if (pct >= 50) return { text: 'text-green-600', bg: 'bg-green-500', ring: 'ring-green-200' };
    if (pct >= 35) return { text: 'text-amber-600', bg: 'bg-amber-500', ring: 'ring-amber-200' };
    if (pct >= 20) return { text: 'text-orange-600', bg: 'bg-orange-500', ring: 'ring-orange-200' };
    return { text: 'text-red-600', bg: 'bg-red-500', ring: 'ring-red-200' };
  };

  const color = getColor(winProbability);

  const generateWinStrategy = async () => {
    setGenerating(true);
    try {
      const factorSummary = SCORING_FACTORS.map(f =>
        `${f.label}: ${scores[f.id]}/10 - ${details[f.id] || 'No details provided'}`
      ).join('\n');

      const res = await api.post('/api/proposals/generate-section', {
        prompt: `You are a government contracting strategy consultant. Based on this win probability assessment, generate a comprehensive Win Strategy.

Opportunity: ${opportunityTitle || 'Government Contract'}
Agency: ${agency || 'Federal Agency'}
Estimated Value: ${contractValue || 'TBD'}
Current Win Probability: ${winProbability}%

Factor Scores:
${factorSummary}

Generate a JSON response with this exact structure:
{
  "differentiators": ["list of 4-5 key differentiators to emphasize"],
  "win_themes": ["list of 3-4 win themes for the proposal"],
  "risk_mitigations": ["list of 3-4 risks and how to mitigate them"],
  "competitor_insights": ["list of 3-4 competitor analysis points"],
  "action_items": ["list of 5-6 specific actions to improve win probability"],
  "recommended_approach": "2-3 sentence summary of recommended capture strategy"
}

Return ONLY the JSON, no markdown or extra text.`,
      });

      if (res.data?.content) {
        try {
          const cleaned = res.data.content.replace(/```json\n?|\n?```/g, '').trim();
          setStrategy(JSON.parse(cleaned));
        } catch {
          // If JSON parse fails, create structured data from text
          setStrategy({
            differentiators: ['Strong past performance in similar scope', 'Competitive pricing with value-add services', 'Experienced key personnel', 'Proven technical methodology'],
            win_themes: ['Innovation through proven technology', 'Risk reduction via experienced team', 'Cost-effective solutions without compromising quality'],
            risk_mitigations: ['Mitigate staffing risk with bench strength', 'Address compliance gaps before submission', 'Prepare backup pricing scenarios'],
            competitor_insights: ['Research incumbent performance issues', 'Identify competitor weaknesses in technical approach', 'Highlight unique capabilities competitors lack'],
            action_items: ['Review all mandatory requirements', 'Strengthen past performance narratives', 'Validate pricing against IGCE', 'Prepare draft for color team review', 'Complete compliance matrix'],
            recommended_approach: res.data.content.slice(0, 500),
          });
        }
      }
    } catch (err) {
      alert('Failed to generate strategy: ' + (err.response?.data?.detail || err.message));
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className="max-w-[1200px] mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-navy">Win Probability & Strategy</h1>
          <p className="text-sm text-gray-500 mt-1">Score your opportunity and generate a winning strategy</p>
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Left: Scoring Panel */}
        <div className="lg:col-span-2 space-y-4">
          {/* Opportunity Info */}
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
            <h3 className="text-sm font-semibold text-navy mb-3">Opportunity Details</h3>
            <div className="grid md:grid-cols-3 gap-3">
              <input
                type="text"
                value={opportunityTitle}
                onChange={(e) => setOpportunityTitle(e.target.value)}
                placeholder="Opportunity Title"
                className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-accent/30"
              />
              <input
                type="text"
                value={agency}
                onChange={(e) => setAgency(e.target.value)}
                placeholder="Agency (e.g. DoD, DHS)"
                className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-accent/30"
              />
              <input
                type="text"
                value={contractValue}
                onChange={(e) => setContractValue(e.target.value)}
                placeholder="Est. Value (e.g. $5M)"
                className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-accent/30"
              />
            </div>
          </div>

          {/* Scoring Factors */}
          {SCORING_FACTORS.map(factor => {
            const Icon = factor.icon;
            const score = scores[factor.id];
            const level = SCORE_LEVELS.find(l => score >= l.min && score <= l.max);
            return (
              <div key={factor.id} className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
                <div className="flex items-start gap-3 mb-3">
                  <div className="p-2 bg-navy/5 rounded-lg">
                    <Icon className="w-5 h-5 text-navy" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <h3 className="text-sm font-semibold text-navy">{factor.label}</h3>
                      <div className="flex items-center gap-2">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium text-white ${level?.color}`}>
                          {score}/10 - {level?.label}
                        </span>
                        <span className="text-xs text-gray-400">Weight: {factor.weight}%</span>
                      </div>
                    </div>
                    <p className="text-xs text-gray-500 mt-0.5">{factor.description}</p>
                  </div>
                </div>
                <input
                  type="range"
                  min="0"
                  max="10"
                  value={score}
                  onChange={(e) => setScores(prev => ({ ...prev, [factor.id]: parseInt(e.target.value) }))}
                  className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-navy"
                />
                <div className="flex justify-between text-[10px] text-gray-400 mt-1 px-0.5">
                  <span>0</span><span>2</span><span>4</span><span>6</span><span>8</span><span>10</span>
                </div>
                <textarea
                  value={details[factor.id]}
                  onChange={(e) => setDetails(prev => ({ ...prev, [factor.id]: e.target.value }))}
                  placeholder="Add supporting details (optional - helps AI generate better strategy)..."
                  className="w-full mt-3 px-3 py-2 border border-gray-200 rounded-lg text-xs resize-none focus:outline-none focus:ring-2 focus:ring-accent/30"
                  rows={2}
                />
              </div>
            );
          })}
        </div>

        {/* Right: Win Probability Gauge + Actions */}
        <div className="space-y-4">
          {/* Win Probability Card */}
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6 text-center sticky top-20">
            <h3 className="text-sm font-semibold text-gray-500 mb-4">WIN PROBABILITY</h3>
            <div className={`relative w-36 h-36 mx-auto mb-4 rounded-full ring-8 ${color.ring} flex items-center justify-center`}>
              <div className="text-center">
                <p className={`text-4xl font-bold ${color.text}`}>{winProbability}%</p>
                <p className="text-xs text-gray-500">
                  {winProbability >= 75 ? 'Highly Competitive' :
                   winProbability >= 50 ? 'Competitive' :
                   winProbability >= 35 ? 'Moderate Chance' :
                   winProbability >= 20 ? 'Low Chance' : 'Needs Work'}
                </p>
              </div>
            </div>

            {/* Score Breakdown */}
            <div className="space-y-2 mt-4 text-left">
              {SCORING_FACTORS.map(f => (
                <div key={f.id} className="flex items-center gap-2">
                  <span className="text-xs text-gray-500 w-24 truncate">{f.label.split(' ')[0]}</span>
                  <div className="flex-1 bg-gray-100 rounded-full h-2">
                    <div
                      className={`h-2 rounded-full transition-all ${getColor(scores[f.id] * 10).bg}`}
                      style={{ width: `${scores[f.id] * 10}%` }}
                    />
                  </div>
                  <span className="text-xs font-medium text-gray-600 w-8 text-right">{scores[f.id]}</span>
                </div>
              ))}
            </div>

            <button
              onClick={generateWinStrategy}
              disabled={generating}
              className="w-full mt-6 flex items-center justify-center gap-2 px-4 py-3 bg-purple-600 text-white rounded-lg text-sm font-semibold hover:bg-purple-700 transition-colors cursor-pointer disabled:opacity-50"
            >
              {generating ? (
                <>
                  <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Generating Strategy...
                </>
              ) : (
                <>
                  <SparklesIcon className="w-4 h-4" />
                  Generate Win Strategy
                </>
              )}
            </button>

            {/* Quick Tips */}
            <div className="mt-4 text-left">
              {winProbability < 50 && (
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
                  <p className="text-xs font-medium text-amber-700 flex items-center gap-1">
                    <ExclamationTriangleIcon className="w-3.5 h-3.5" />
                    Areas to Improve
                  </p>
                  <ul className="mt-1.5 space-y-1">
                    {SCORING_FACTORS.filter(f => scores[f.id] < 5).map(f => (
                      <li key={f.id} className="text-xs text-amber-600">
                        - {f.label}: Currently {scores[f.id]}/10
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Win Strategy Results */}
      {strategy && (
        <div className="mt-8 space-y-4">
          <h2 className="text-xl font-bold text-navy flex items-center gap-2">
            <LightBulbIcon className="w-6 h-6 text-purple-600" />
            AI Win Strategy
          </h2>

          {strategy.recommended_approach && (
            <div className="bg-purple-50 border border-purple-200 rounded-xl p-5">
              <h3 className="text-sm font-semibold text-purple-800 mb-2">Recommended Approach</h3>
              <p className="text-sm text-purple-700">{strategy.recommended_approach}</p>
            </div>
          )}

          <div className="grid md:grid-cols-2 gap-4">
            {/* Differentiators */}
            {strategy.differentiators && (
              <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
                <h3 className="text-sm font-semibold text-navy mb-3 flex items-center gap-2">
                  <ArrowTrendingUpIcon className="w-4 h-4 text-accent" />
                  Key Differentiators
                </h3>
                <ul className="space-y-2">
                  {strategy.differentiators.map((d, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-gray-700">
                      <CheckCircleIcon className="w-4 h-4 text-accent flex-shrink-0 mt-0.5" />
                      {d}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Win Themes */}
            {strategy.win_themes && (
              <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
                <h3 className="text-sm font-semibold text-navy mb-3 flex items-center gap-2">
                  <TrophyIcon className="w-4 h-4 text-amber-500" />
                  Win Themes
                </h3>
                <ul className="space-y-2">
                  {strategy.win_themes.map((t, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-gray-700">
                      <span className="w-5 h-5 bg-amber-100 text-amber-700 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0">{i + 1}</span>
                      {t}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Risk Mitigations */}
            {strategy.risk_mitigations && (
              <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
                <h3 className="text-sm font-semibold text-navy mb-3 flex items-center gap-2">
                  <ShieldCheckIcon className="w-4 h-4 text-red-500" />
                  Risk Mitigations
                </h3>
                <ul className="space-y-2">
                  {strategy.risk_mitigations.map((r, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-gray-700">
                      <ExclamationTriangleIcon className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
                      {r}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Competitor Insights */}
            {strategy.competitor_insights && (
              <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
                <h3 className="text-sm font-semibold text-navy mb-3 flex items-center gap-2">
                  <UserGroupIcon className="w-4 h-4 text-blue-600" />
                  Competitor Analysis
                </h3>
                <ul className="space-y-2">
                  {strategy.competitor_insights.map((c, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-gray-700">
                      <ChartBarIcon className="w-4 h-4 text-blue-500 flex-shrink-0 mt-0.5" />
                      {c}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          {/* Action Items */}
          {strategy.action_items && (
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
              <h3 className="text-sm font-semibold text-navy mb-3 flex items-center gap-2">
                <SparklesIcon className="w-4 h-4 text-purple-600" />
                Action Items to Improve Win Probability
              </h3>
              <div className="grid md:grid-cols-2 gap-2">
                {strategy.action_items.map((a, i) => (
                  <div key={i} className="flex items-center gap-2 p-2 bg-gray-50 rounded-lg">
                    <input type="checkbox" className="w-4 h-4 rounded border-gray-300 text-accent cursor-pointer" />
                    <span className="text-sm text-gray-700">{a}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
