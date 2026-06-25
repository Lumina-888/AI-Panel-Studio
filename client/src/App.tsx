import { Routes, Route } from 'react-router-dom'
import { AppLayout } from './components/layout/AppLayout'
import { DiscussionRoom } from './components/discussion/DiscussionRoom'

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<AppLayout />}>
        <Route path="discussion/:id" element={<DiscussionRoom />} />
      </Route>
    </Routes>
  )
}
