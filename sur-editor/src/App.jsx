import SUREditorViewer from './components/SUREditorViewer'

function App() {
  return (
    <div className="min-h-screen w-full bg-background font-sans antialiased">
      <main className="flex-1">
        <div className="container py-6">
          <SUREditorViewer />
        </div>
      </main>
    </div>
  )
}

export default App