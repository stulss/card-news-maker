// PRD.md 43장 F-30~F-33 야구 결과 카드뉴스 탭.
import { useState } from "react";
import type { Layer } from "../../types/canvas";
import type { KboGame } from "../../types/baseball";
import { fetchKboSchedule, KboScheduleRequestError } from "../../features/baseball/fetchKboSchedule";
import { buildScoreboardLayers } from "../../features/baseball/buildScoreboardLayers";
import { KBO_TEAMS } from "../../features/baseball/teams";

interface Props {
  projectWidth: number;
  projectHeight: number;
  onGenerateCard: (result: { backgroundColor: string; layers: Layer[] }) => void;
}

const STATUS_LABEL: Record<KboGame["status"], string> = {
  final: "종료",
  canceled: "취소",
  scheduled: "예정",
};

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

export function BaseballTab({ projectWidth, projectHeight, onGenerateCard }: Props) {
  const [date, setDate] = useState(todayIso);
  const [games, setGames] = useState<KboGame[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showManual, setShowManual] = useState(false);

  async function handleSearch(event: React.FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError(null);
    setGames(null);
    try {
      const result = await fetchKboSchedule(date);
      setGames(result);
    } catch (err) {
      setError(err instanceof KboScheduleRequestError ? err.message : "경기 결과를 불러오지 못했습니다.");
    } finally {
      setLoading(false);
    }
  }

  function handleSelectGame(game: KboGame) {
    if (game.status === "scheduled") return; // F-33: 미종료 경기는 카드 생성 버튼 비활성화
    onGenerateCard(buildScoreboardLayers(game, projectWidth, projectHeight));
  }

  return (
    <aside className="template-panel baseball-panel" aria-label="야구 결과 카드">
      <h2>야구 결과 카드</h2>

      <form className="template-create" onSubmit={handleSearch}>
        <input type="date" value={date} onChange={(event) => setDate(event.target.value)} aria-label="조회할 날짜" />
        <button type="submit" disabled={loading}>{loading ? "조회 중..." : "조회"}</button>
      </form>

      <div className="template-list baseball-game-list">
        {error && (
          <div className="baseball-status-block">
            <p className="panel-placeholder">{error}</p>
            <button type="button" onClick={() => setShowManual((v) => !v)}>팀·점수 직접 입력</button>
          </div>
        )}

        {!error && games !== null && games.length === 0 && (
          <p className="panel-placeholder">해당 날짜에 경기가 없습니다.</p>
        )}

        {!error && games !== null && games.map((game) => (
          <article className="template-item baseball-game-item" key={game.gameId}>
            <div className={`baseball-status-badge status-${game.status}`}>{STATUS_LABEL[game.status]}</div>
            <div className="baseball-matchup">
              <span>{game.away.name}</span>
              <strong>
                {game.status === "final" ? `${game.away.score} : ${game.home.score}` : "vs"}
              </strong>
              <span>{game.home.name}</span>
            </div>
            <div className="template-meta">
              {game.status === "canceled" ? game.cancelReason : game.stadium}
              {game.status === "scheduled" ? " · 아직 결과가 없습니다" : ""}
            </div>
            <div className="template-actions">
              <button type="button" disabled={game.status === "scheduled"} onClick={() => handleSelectGame(game)}>
                카드 만들기
              </button>
            </div>
          </article>
        ))}

        {showManual && <ManualScoreForm onSubmit={(game) => { onGenerateCard(buildScoreboardLayers(game, projectWidth, projectHeight)); setShowManual(false); }} onCancel={() => setShowManual(false)} />}
      </div>

      <p className="layer-panel-footer">
        구단 엠블럼의 저작권은 각 구단 및 KBO에 있으며, 비상업적 과제 제출 용도로만 표시합니다.
      </p>
    </aside>
  );
}

// PRD.md 44장 "실패 처리": 조회 실패 시 팀·점수 직접 입력 경로 제공.
function ManualScoreForm({ onSubmit, onCancel }: { onSubmit: (game: KboGame) => void; onCancel: () => void }) {
  const codes = Object.keys(KBO_TEAMS);
  const [awayCode, setAwayCode] = useState(codes[0]);
  const [homeCode, setHomeCode] = useState(codes[1]);
  const [awayScore, setAwayScore] = useState(0);
  const [homeScore, setHomeScore] = useState(0);

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    const game: KboGame = {
      gameId: `manual-${todayIso()}-${awayCode}${homeCode}`,
      date: todayIso(),
      stadium: "직접 입력",
      status: "final",
      away: { code: awayCode, name: awayCode, score: awayScore },
      home: { code: homeCode, name: homeCode, score: homeScore },
    };
    onSubmit(game);
  }

  return (
    <form className="template-item baseball-manual-form" onSubmit={handleSubmit}>
      <label>
        <span>원정팀</span>
        <select value={awayCode} onChange={(event) => setAwayCode(event.target.value)}>
          {codes.map((code) => <option key={code} value={code}>{code}</option>)}
        </select>
      </label>
      <input type="number" min={0} value={awayScore} onChange={(event) => setAwayScore(Number(event.target.value))} aria-label="원정팀 점수" />
      <label>
        <span>홈팀</span>
        <select value={homeCode} onChange={(event) => setHomeCode(event.target.value)}>
          {codes.map((code) => <option key={code} value={code}>{code}</option>)}
        </select>
      </label>
      <input type="number" min={0} value={homeScore} onChange={(event) => setHomeScore(Number(event.target.value))} aria-label="홈팀 점수" />
      <div className="template-actions">
        <button type="submit">카드 만들기</button>
        <button type="button" className="danger" onClick={onCancel}>취소</button>
      </div>
    </form>
  );
}
