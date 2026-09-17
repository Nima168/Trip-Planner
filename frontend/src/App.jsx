import { Route, Routes } from 'react-router-dom'
import TripList from './pages/TripList.jsx'
import ItineraryEditor from './pages/ItineraryEditor.jsx'
import ShareView from './pages/ShareView.jsx'

function App() {
  return (
    <Routes>
      <Route path="/" element={<TripList />} />
      <Route path="/trips/:tripId" element={<ItineraryEditor />} />
      <Route path="/share/:token" element={<ShareView />} />
    </Routes>
  )
}

export default App
