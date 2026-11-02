import { Component, type ReactNode } from 'react';
export default class RuntimeBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  render() {
    if (this.state.failed) return <main role="alert" className="p-10 max-w-xl mx-auto space-y-5">
      <h1 className="text-2xl font-bold">This page could not be displayed</h1>
      <p>Reload to try again. If this continues, return home or contact us.</p>
      <button className="border rounded p-3" onClick={() => window.location.reload()}>Reload page</button>
      <p><a href="/" className="underline">Home</a> · <a href="/contact" className="underline">Contact</a></p>
    </main>;
    return this.props.children;
  }
}
