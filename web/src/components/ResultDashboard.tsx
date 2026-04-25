import { BarChart3 } from "lucide-react";
import { useConversation } from "../store/conversation";
import { ChartView } from "./ChartView";
import { InsightCard } from "./InsightCard";
import { RecommendationCard } from "./RecommendationCard";
import { SqlTransparencyDrawer } from "./SqlTransparencyDrawer";
import { AlertBanner } from "./AlertBanner";

export function ResultDashboard() {
  const { messages, selectedMessageId } = useConversation();
  const selected = messages.find((m) => m.id === selectedMessageId);
  const response = selected?.response;

  if (!response) {
    return (
      <div className="h-full grid place-items-center text-center px-8">
        <div className="space-y-3 max-w-md">
          <BarChart3 className="mx-auto text-gray-600" size={56} />
          <div className="text-xl font-semibold text-gray-200">Insights will appear here</div>
          <div className="text-sm text-gray-500">
            Ask a question on the left or click a suggestion. The Copilot will run a 9-agent pipeline and render the answer here with full transparency.
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto p-6 space-y-4">
      <div>
        <div className="text-xs uppercase tracking-wide text-gray-500 mb-1">Question</div>
        <h2 className="text-lg font-semibold text-gray-100">{response.query}</h2>
        {response.memory.previousQueries.length > 0 && (
          <div className="text-xs text-gray-500 mt-1">
            Memory context: {response.memory.previousQueries.length} prior turn(s).
          </div>
        )}
      </div>

      {response.alert && <AlertBanner level={response.alert.level} message={response.alert.message} />}

      {response.blocked ? (
        <div className="rounded-2xl border border-bad-500/40 bg-bad-500/10 p-4">
          <div className="text-sm font-medium text-bad-500">Query blocked</div>
          <div className="text-sm text-gray-300 mt-1">{response.blockedReason}</div>
        </div>
      ) : (
        <>
          {response.data && response.chart && (
            <div className="glass rounded-2xl p-4 relative">
              <ChartView data={response.data} chart={response.chart} />
            </div>
          )}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {response.explanation && (
              <InsightCard insight={response.explanation.insight} keyNumbers={response.explanation.keyNumbers} />
            )}
            {response.recommendation && (
              <RecommendationCard recommendation={response.recommendation.recommendation} action={response.recommendation.action} />
            )}
          </div>
        </>
      )}

      <SqlTransparencyDrawer response={response} />
    </div>
  );
}
