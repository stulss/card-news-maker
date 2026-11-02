import { Component, type ErrorInfo, type ReactNode } from "react";

interface Props { children: ReactNode }
interface State { error: Error | null }

/** 예기치 못한 오류로 화면이 하얗게 되는 대신 복구 안내를 보여준다. 자동 저장된 작업은 다시 열면 복원된다. */
export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State { return { error }; }

  componentDidCatch(error: Error, info: ErrorInfo) { console.error("Unhandled UI error", error, info.componentStack); }

  render() {
    if (!this.state.error) return this.props.children;
    return (
      <div className="error-boundary" role="alert">
        <h1>문제가 생겼어요</h1>
        <p>화면을 그리는 중 오류가 발생했습니다. 작업은 자동 저장되어 있어, 새로고침하면 대부분 그대로 복원돼요.</p>
        <p className="error-boundary-detail">{this.state.error.message}</p>
        <button type="button" className="btn primary" onClick={() => window.location.reload()}>새로고침</button>
      </div>
    );
  }
}
