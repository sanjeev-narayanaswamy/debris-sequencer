import React, { Component } from 'react';
import "./assets/theme.css";
import { Engine } from './engine';
import Info from './Info';
import Search from './Search/Search';
import SelectedStations from './Selection/SelectedStations';
import Fork from './fork';
import * as qs from 'query-string';
import Highlights from './highlights';

// Bypass CORS
function getCorsFreeUrl(url) {
    return 'https://api.allorigins.win/raw?url=' + url;    
}


class App extends Component {

    state = {
        selected: [],
        stations: [], 
        query: null,
        queryObjectCount: 0
    }

    componentDidMount() {
        this.engine = new Engine();
        this.engine.initialize(this.el, {
            onStationClicked: this.handleStationClicked
        });
        this.addStations();

        setInterval(this.handleTimer, 1000);
    }

    componentWillUnmount() {
        this.engine.dispose();
    }

    processQuery = (stations) => {
        const q = window.location.search;
        if (!q) return;

        const params = qs.parse(q);

        if (params.ss) {
            const selectedIds = params.ss.split(',');
            if (!selectedIds || selectedIds.length === 0) return;

            selectedIds.forEach(id => {
                const station = this.findStationById(stations, id);
                if (station) this.selectStation(station);
            });
        }

        if (params.highlight) {
            const query = params.highlight;
            const matches = this.queryStationsByName(stations, query);
            matches.forEach(st => this.engine.highlightStation(st));
            this.setState({...this.state, query, queryObjectCount: matches.length });
        }
    }

    queryStationsByName = (stations, query) => {
        query = query.toLowerCase();
        return stations.filter(st => st.name.toLowerCase().indexOf(query) > -1)
    }

    findStationById = (stations, id) => {
        return stations.find(st => st.satrec && st.satrec.satnum == id);
    }

    handleStationClicked = (station) => {
        if (!station) return;

        this.toggleSelection(station);
    }

    toggleSelection(station) {
        if (this.isSelected(station))
            this.deselectStation(station);
        else
            this.selectStation(station);
    }

    isSelected = (station) => {
        return this.state.selected.includes(station);
    }

    selectStation = (station) => {
        const newSelected = this.state.selected.concat(station);
        this.setState({selected: newSelected});

        this.engine.addOrbit(station);
    }

    deselectStation = (station) => {
        const newSelected = this.state.selected.filter(s => s !== station);
        this.setState( { selected: newSelected } );

        this.engine.removeOrbit(station);
    }

    addStations = () => {
        this.addCelestrakSets();
        //this.engine.addSatellite(ISS);
        //this.addAmsatSets();
    }

    addCelestrakSets = () => {
        //this.engine.loadLteFileStations(getCorsFreeUrl('http://www.celestrak.com/NORAD/elements/weather.txt'), 0x00ffff)
        //this.engine.loadLteFileStations(getCorsFreeUrl('http://www.celestrak.com/NORAD/elements/active.txt'), 0xffffff)
        //this.engine.loadLteFileStations(getCorsFreeUrl('http://www.celestrak.com/NORAD/elements/science.txt'), 0xffff00)
        //this.engine.loadLteFileStations(getCorsFreeUrl('http://www.celestrak.com/NORAD/elements/stations.txt'), 0xffff00)
        //this.engine.loadLteFileStations(getCorsFreeUrl('http://www.celestrak.com/NORAD/elements/cosmos-2251-debris.txt'), 0xff0000)
        //this.engine.loadLteFileStations(getCorsFreeUrl('http://www.celestrak.com/NORAD/elements/iridium-NEXT.txt'), 0x00ff00)
        //this.engine.loadLteFileStations(getCorsFreeUrl('http://www.celestrak.com/NORAD/elements/gps-ops.txt'), 0x00ff00)
        //this.engine.loadLteFileStations(getCorsFreeUrl('http://www.celestrak.com/NORAD/elements/ses.txt'), 0xffffff)
        //this.engine.loadLteFileStations(getCorsFreeUrl('http://www.celestrak.com/NORAD/elements/starlink.txt'), 0xffffff)
        //this.engine.loadLteFileStations(getCorsFreeUrl('http://www.celestrak.com/NORAD/elements/gps-ops.txt'), 0xffffff, { orbitMinutes: 0, satelliteSize: 200 })
        //this.engine.loadLteFileStations(getCorsFreeUrl('http://www.celestrak.com/NORAD/elements/glo-ops.txt'), 0xff0000, { orbitMinutes: 500, satelliteSize: 500 })
        this.engine.loadLteFileStations(getCorsFreeUrl('http://www.celestrak.com/NORAD/elements/2019-006.txt'), 0xff8888)
        this.engine.loadLteFileStations(getCorsFreeUrl('http://www.celestrak.com/NORAD/elements/1999-025.txt'), 0x88ff88)
        this.engine.loadLteFileStations(getCorsFreeUrl('http://www.celestrak.com/NORAD/elements/iridium-33-debris.txt'), 0x8888ff)
        this.engine.loadLteFileStations(getCorsFreeUrl('http://www.celestrak.com/NORAD/elements/cosmos-2251-debris.txt'), 0xffff88)
            .then(stations => {
                this.setState({stations});
                this.processQuery(stations);
            });

    }

    addAmsatSets = () => {
        this.engine.loadLteFileStations(getCorsFreeUrl('https://www.amsat.org/tle/current/nasabare.txt'), 0xffff00);
    }

    handleTimer = () => {
        this.engine.updateAllPositions(new Date());
    }

    handleSearchResultClick = (station) => {
        if (!station) return;

        this.toggleSelection(station);
    }

    handleRemoveSelected = (station) => {
        if (!station) return;
        
        this.deselectStation(station);
    }

    handleRemoveAllSelected = () => {
        this.state.selected.forEach(s => this.engine.removeOrbit(s));
        this.setState({selected: []});
    }

    render() {
        const { selected, stations } = this.state;

        return (
            <div>
                <Fork />
                <Highlights query={this.state.query} total={this.state.queryObjectCount} />
                <Info stations={stations} />
                <Search stations={this.state.stations} onResultClick={this.handleSearchResultClick} />
                <SelectedStations selected={selected} onRemoveStation={this.handleRemoveSelected} onRemoveAll={this.handleRemoveAllSelected} />
                <div ref={c => this.el = c} style={{ width: '100%', height: '100%' }} />
            </div>
        )
    }
}

export default App;
