import { useState } from 'react';
import useWebSocket from 'react-use-websocket';
import './App.css';

const WS_URL = 'wss://api.livereachmedia.com/api/v1/marketing/displays/internal//ws?v=1&passive=true&zone_id=4111';

function App() {
  const [occupancy, setOccupancy] = useState(null);

  useWebSocket(WS_URL, {
    onOpen: () => {
      console.log('WebSocket connection established.');
    },
    onMessage: (payload) => {
      const data = JSON.parse(payload.data);
      setOccupancy(data.args.camera.occupancy);
    }
  });

  return (
    <div>
      {occupancy && <p>Concorde Room occupancy is currently {occupancy} out of 188.</p>}
    </div>
  );
}

export default App;
