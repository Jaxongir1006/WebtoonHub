import React from 'react';
interface Props { children: React.ReactNode; message: string; retryLabel: string; }
export class ErrorBoundary extends React.Component<Props, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  render() {
    if (this.state.failed) return <div role="alert" className="mx-auto max-w-lg p-8 text-center"><p className="mb-4">{this.props.message}</p><button className="min-h-[44px] rounded-xl bg-brand-500 text-studio-950 px-5 font-semibold" onClick={() => window.location.reload()}>{this.props.retryLabel}</button></div>;
    return this.props.children;
  }
}
