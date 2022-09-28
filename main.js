'use strict';

const form = document.querySelector('.form');
const inputCadence = document.querySelector('#inputCadence');
const inputDuration = document.querySelector('#inputDuration');
const inputType = document.querySelector('#inputType');
const inputDistance = document.querySelector('#inputDistance');
const inputElevation = document.querySelector('#inputElevation');
const containerWorkouts = document.querySelector('.workouts');

class Workout {
    id = (Date.now().toString()).slice(-10);
    date = new Date();
    constructor(distance, duration, coords){
        this.coords = coords; // [lat, lng]
        this.distance = distance; // in km
        this.duration = duration; // in min
    }

    _setDescription(){
        const months = ['January','February','March','April','May','June','July','August','September','October','November','December'];
        this.description = `${this.type[0].toUpperCase()}${this.type.slice(1)} on ${months[this.date.getMonth()]} ${this.date.getDate()}`
    }
}

class Running extends Workout {
    type = 'running';
    constructor(coords, distance, duration, cadence){
        super (distance, duration, coords);
        this.cadence = cadence;
        this.calcPace();
        this._setDescription();
    }

    calcPace() {
        // min/km
        this.pace = this.duration / this.distance;
        return this.pace
    }
}

class Cycling extends Workout {
    type = 'cycling';
    constructor(coords, distance, duration, elevationGain){
        super (distance, duration, coords);
        this.elevationGain = elevationGain;
        this.calcSpeed();
        this._setDescription();
    }

    calcSpeed() {
        this.speed = this.distance / (this.duration / 60);
        return this.speed
    }
}

/////////////////////////////////////
// APPLICATION ARCHITECTURE
class App {
    #map;
    #mapEvent;
    #workouts = [];
    #mapZoomLevel = 12;

    constructor(){
        this._getLocalStorage();
        this._getPosition();
        form.addEventListener('submit', this._newWorkout.bind(this));
        inputType.addEventListener('change' , this._toggleElevationField);
        containerWorkouts.addEventListener('click' , this._moveToPosition.bind(this));
    }

    // Geolocation init
    _getPosition(){
        navigator.geolocation.getCurrentPosition(this._loadMap.bind(this), (err) => alert(err.message))
    }

    _loadMap(e){
        // Leaflet init
        const coords = [e.coords.latitude, e.coords.longitude]
        this.#map = L.map('map').setView(coords, this.#mapZoomLevel);

    
        L.tileLayer('https://{s}.tile.openstreetmap.fr/hot/{z}/{x}/{y}.png', {
            attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        }).addTo(this.#map);
        this.#map.on('click', this._showForm.bind(this))
        this.#workouts.forEach( work => {
            this._renderWorkoutMarker(work)
        });
    }
    
    _showForm(e) {
        this.#mapEvent = e;
        form.classList.remove('hidden');
        inputDistance.focus();
    }

    _toggleElevationField(){
        inputElevation.closest('.form-group').classList.toggle('hidden');
        inputCadence.closest('.form-group').classList.toggle('hidden');
    }

    _newWorkout(e){
        const {lat,lng} = this.#mapEvent.latlng;
        e.preventDefault();
        const validInputs = (...inputs) => inputs.every(inp => Number.isFinite(inp));
        const allPositive = (...inputs) => inputs.every(inp => inp > 0);
        const type = inputType.value;
        const distance = +inputDistance.value;
        const duration = +inputDuration.value;
        let workout;

        if (type === 'running') {
            const cadence = +inputCadence.value;
            if (!validInputs(distance, duration, cadence) || !allPositive(distance, duration, cadence)) {
                return alert("Inputs must be positive numbers!")
            }
            workout = new Running([lat,lng], distance, duration, cadence)
        } 

        if (type === 'cycling'){
            const elevation = +inputElevation.value;
            if (!validInputs(distance, duration, elevation) || !allPositive(distance, duration)) {
                return alert("Inputs must be positive numbers!")
            }
            workout = new Cycling([lat,lng], distance, duration, elevation)
        }
        this.#workouts.push(workout);
        this._renderWorkoutMarker(workout)
        this._renderWorkout(workout)
        this._setLocalStorage();
    }

    _renderWorkoutMarker(workout){
        L.marker(workout.coords).addTo(this.#map).bindPopup(L.popup({
            maxWidth:250,
            minWidth:200,
            autoClose:false,
            closeOnClick:false,
            className:workout.type
        }))
        .setPopupContent(`${workout.type === 'running' ? '<i class="fa-solid fa-person-running"></i>' : '<i class="fa-solid fa-person-biking"></i>'} ${workout.description}`)
        .openPopup();
        this._clearForm();
    }

    _renderWorkout(workout){
        let html = `
        <li class="workout-${workout.type} pointer" data-id="${workout.id}">
        <h6 class="title">${workout.description}</h6>
        <div class="d-flex flex-wrap">
            <div class="details">
                <span class="icon">
                    ${workout.type === 'running' ? '<i class="fa-solid fa-person-running"></i>' : '<i class="fa-solid fa-person-biking"></i>'}
                </span>
                <span class="value">${workout.distance}</span>
                <span class="unit">KM</span>
            </div>
            <div class="details">
                <span class="icon"><i class="fa-solid fa-clock"></i></span>
                <span class="value">${workout.duration}</span>
                <span class="unit">MIN</span>
            </div>
        `;

        if (workout.type === 'running') {
            html += `
                    <div class="details">
                        <span class="icon"><i class="fa-solid fa-bolt"></i></span>
                        <span class="value">${workout.pace.toFixed(1)}</span>
                        <span class="unit">MIN/KM</span>
                    </div>
                    <div class="details">
                        <span class="icon"><i class="fa-solid fa-shoe-prints"></i></span>
                        <span class="value">${workout.cadence}</span>
                        <span class="unit">SPM</span>
                    </div>
                </div>
            </li>
            `
        }
        else{
            html += `
                <div class="details">
                    <span class="icon"><i class="fa-solid fa-bolt"></i></span>
                    <span class="value">${workout.speed.toFixed(1)}</span>
                    <span class="unit">KM/H</span>
                </div>
                <div class="details">
                    <span class="icon"><i class="fa-solid fa-mountain-sun"></i></span>
                    <span class="value">${workout.elevationGain}</span>
                    <span class="unit">M</span>
                </div>
            </div>`
        }
        containerWorkouts.insertAdjacentHTML('beforeend',html)
    }

    _clearForm(){
        inputDistance.value = '';
        inputCadence.value = '';
        inputElevation.value = '';
        inputDuration.value = '';
        this._hideForm();
    }

    _hideForm(){
        form.classList.add("hidden")
    }
    
    _moveToPosition(e){
        const workoutElement = e.target.closest('li');
        if(!workoutElement) return;
        const workout = this.#workouts.find( work => work.id === workoutElement.dataset.id);
        this.#map.setView(workout.coords,this.#mapZoomLevel, {
            animate:true,
            pan:{
                duration:1
            }
        })
    }

    _setLocalStorage(){
        localStorage.setItem('workouts', JSON.stringify(this.#workouts))
    }

    _getLocalStorage(){
       const data = JSON.parse(localStorage.getItem('workouts'));
       if (!data) return;
        this.#workouts = data;
        this.#workouts.forEach( work => {
            this._renderWorkout(work)
        });
    }

    reset(){
        localStorage.removeItem('workouts');
        location.reload();
    }
}

const app = new App();

document.getElementById("reset").addEventListener('click', () => {
    app.reset()
})