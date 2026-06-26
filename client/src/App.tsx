import { Routes, Route } from 'react-router-dom'
import { HomePage } from './pages/HomePage'
import { StudioLayout } from './pages/StudioLayout'
import { DiscussionRoom } from './components/discussion/DiscussionRoom'

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<HomePage />} />
      <Route path="/discussions" element={<StudioLayout />}>
        <Route path=":id" element={<DiscussionRoom />} />
      </Route>
    </Routes>
  )
}
