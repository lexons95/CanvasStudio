import { BottomToolbar } from './components/BottomToolbar'
import { KeyboardShortcuts } from './components/KeyboardShortcuts'
import { CanvasStage } from './components/canvas/CanvasStage'
import { ControlPanel } from './components/controls/ControlPanel'

function App() {
  return (
    <div className="relative min-h-screen text-white">
      <KeyboardShortcuts />
      <CanvasStage />
      <div className="fixed top-0 right-0 z-20 p-4 lg:p-6 max-h-screen overflow-y-auto">
        <ControlPanel />
      </div>
      <div className="fixed bottom-0 left-0 right-0 z-20 lg:hidden">
        <BottomToolbar />
      </div>
    </div>
  )
}

export default App
