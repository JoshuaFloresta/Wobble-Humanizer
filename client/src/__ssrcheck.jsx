import { renderToString } from 'react-dom/server';
import App from './App.jsx';
import Controls from './components/Controls.jsx';
import OutputCard from './components/OutputCard.jsx';
import MetricsDisplay from './components/MetricsDisplay.jsx';
import HistoryPanel from './components/HistoryPanel.jsx';

export function render() {
  return renderToString(<App />);
}

export function renderWithData({ presets, options, result, history }) {
  return {
    controls: renderToString(
      <Controls presets={presets} options={options} onChange={() => {}} onSubmit={() => {}} busy={false} canSubmit />,
    ),
    output: renderToString(<OutputCard result={result} onExport={() => {}} onRerun={() => {}} busy={false} />),
    metrics: renderToString(
      <MetricsDisplay before={result.metrics.before} after={result.metrics.after} delta={result.metrics.delta} />,
    ),
    history: renderToString(
      <HistoryPanel items={history} source="server" onSelect={() => {}} onDelete={() => {}} onClear={() => {}} activeId={null} />,
    ),
  };
}
