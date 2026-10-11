import { Component } from 'react';

export default class AppErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  render() {
    if (this.state.hasError) return <main className="app-fatal-state"><div><span className="eyebrow">LAST MILE</span><h1>We hit a snag.</h1><p>This page could not be displayed. Reload to try again.</p><button className="button button-primary" onClick={() => location.reload()}>Reload page</button></div></main>;
    return this.props.children;
  }
}