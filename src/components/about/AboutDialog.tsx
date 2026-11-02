import { useModalFocus } from "../common/useModalFocus";
import { useEffect, useState } from "react";
import { clearAllLocalData, estimateStorageUsage } from "../../features/privacy/clearData";

interface Props {
  onClose: () => void;
  onSaveProject: () => void;
  onOpenProject: () => void;
  onNewDeck: () => void;
  onShowShortcuts: () => void;
}

const formatMb = (bytes: number) => `${(bytes / 1024 / 1024).toFixed(bytes > 10 * 1024 * 1024 ? 0 : 1)}MB`;

/** 메뉴·정보: 프로젝트 파일, 도움말, 데이터 관리(삭제), 법적 고지 링크. */
export function AboutDialog({ onClose, onSaveProject, onOpenProject, onNewDeck, onShowShortcuts }: Props) {
  useModalFocus();
  const [usage, setUsage] = useState<{ usage: number; quota: number } | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => { if (event.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  useEffect(() => { estimateStorageUsage().then(setUsage).catch(() => setUsage(null)); }, []);

  const clearAll = async () => {
    if (!window.confirm("이 브라우저에 저장된 작업(자동 저장), 내 템플릿, 내 스티커, 설정을 모두 지웁니다. 되돌릴 수 없어요.\
\
필요하면 먼저 ‘프로젝트 저장’으로 파일을 만들어 두세요. 계속할까요?")) return;
    setBusy(true);
    await clearAllLocalData();
    window.location.reload();
  };

  return (
    <div className="modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
      <div className="modal about-dialog" role="dialog" aria-modal="true" aria-label="메뉴 및 정보">
        <header className="modal-header">
          <h2>메뉴 · 정보</h2>
          <button type="button" className="icon-btn" onClick={onClose} aria-label="닫기">✕</button>
        </header>
        <div className="modal-body about-body">
          <section>
            <h3>프로젝트 파일</h3>
            <p className="panel-hint">작업 전체(모든 슬라이드·사진)를 내 컴퓨터에 파일로 저장해 두면 브라우저 데이터를 지워도 안전해요.</p>
            <div className="about-actions">
              <button type="button" className="btn primary" onClick={() => { onClose(); onSaveProject(); }}>프로젝트 저장 <kbd>Ctrl+S</kbd></button>
              <button type="button" className="btn" onClick={() => { onClose(); onOpenProject(); }}>프로젝트 열기 <kbd>Ctrl+O</kbd></button>
              <button type="button" className="btn" onClick={() => { onClose(); onNewDeck(); }}>새로 시작</button>
            </div>
          </section>

          <section>
            <h3>도움말</h3>
            <div className="about-actions">
              <button type="button" className="btn" onClick={() => { onClose(); onShowShortcuts(); }}>단축키 보기 <kbd>?</kbd></button>
            </div>
          </section>

          <section>
            <h3>내 데이터</h3>
            <p className="panel-hint">
              사진과 작업은 서버로 보내지 않고 <strong>이 브라우저에만</strong> 저장돼요(자동 저장·내 템플릿·내 스티커·설정).
              {usage && <> 현재 사용량 약 {formatMb(usage.usage)}.</>}
            </p>
            <div className="about-actions">
              <button type="button" className="btn danger-btn" disabled={busy} onClick={clearAll}>저장된 모든 데이터 지우기</button>
            </div>
          </section>

          <section>
            <h3>법적 고지</h3>
            <ul className="about-links">
              <li><a href="/legal/privacy.html" target="_blank" rel="noopener">개인정보 처리방침</a></li>
              <li><a href="/legal/terms.html" target="_blank" rel="noopener">이용 약관</a></li>
              <li><a href="/legal/notices.html" target="_blank" rel="noopener">오픈소스 라이선스 고지</a></li>
            </ul>
            <p className="panel-hint">Instagram은 Meta Platforms, Inc.의 상표입니다. 이 서비스는 Meta와 제휴·후원·보증 관계가 없으며, 규격 안내는 참고용입니다.</p>
          </section>
        </div>
        <footer className="modal-footer">
          <span className="export-size">카드툰 v{__APP_VERSION__}</span>
          <button type="button" className="btn" onClick={onClose}>닫기</button>
        </footer>
      </div>
    </div>
  );
}
