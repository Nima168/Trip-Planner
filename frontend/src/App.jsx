import { Route, Routes } from 'react-router-dom'
import TripList from './pages/TripList.jsx'
import ItineraryEditor from './pages/ItineraryEditor.jsx'

function App() {
  return (
    <Routes>
      <Route path="/" element={<TripList />} />
      <Route path="/trips/:tripId" element={<ItineraryEditor />} />
    </Routes>
  )
}

export default App
