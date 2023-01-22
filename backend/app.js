var initializeApp = require('firebase/app').initializeApp;
var getFirestore = require('firebase/firestore').getFirestore;
var collection = require('firebase/firestore').collection;
var doc = require('firebase/firestore').doc;
var addDoc = require('firebase/firestore').addDoc;
var getDoc = require('firebase/firestore').getDoc;
var doc = require('firebase/firestore').doc;

var express = require('express');
var cors = require('cors');
var axios = require('axios');
require('dotenv').config();

var app = express();
app.use(cors());
app.use(express.json());

// FIREBASE CONFIG

const firebaseConfig = {
    apiKey: 'AIzaSyBidOMsX0DzROn3v29TBS_z1t40gxC0rM4',
    authDomain: 'uofthacks-x-375407.firebaseapp.com',
    projectId: 'uofthacks-x-375407',
    storageBucket: 'uofthacks-x-375407.appspot.com',
    messagingSenderId: '834263756036',
    appId: '1:834263756036:web:488d4b17bc6b71c44d3451',
    measurementId: 'G-8REC5KN4LD'
};
const firebaseApp = initializeApp(firebaseConfig);
const db = getFirestore(firebaseApp);
module.exports = { db };
// COHERE CONFIG

const CohereExtractor = require('./cohereExtractor.js');
const CohereExplainer = require('./cohereExplainer.js');

const cohereKeywordExtractor = new CohereExtractor();
const cohereMatchExplainer = new CohereExplainer();
const getUserInfo = require('./getUserInfo.js');

// GOOGLE MAPS

// async function findPlaceFromText(address) {
//   const res = await axios.get(`https://maps.googleapis.com/maps/api/place/findplacefromtext/json?input=${address}&inputtype=textquery&fields=geometry&key=${process.env.GOOGLE_MAPS_API_KEY}`);
//   const data = res.data;
//   return data.candidates[0].geometry.location;
// }

app.get('/findNearbyRestaurants', async (req, res, next) => {
    // const data = await findPlaceFromText(req.body.address);
    axios
        .get(
            `https://maps.googleapis.com/maps/api/place/nearbysearch/json?location=${req.body.lat},${req.body.lng}&radius=5000&type=restaurant&maxprice=${req.body.budget}&rankby=prominence&key=${process.env.GOOGLE_MAPS_API_KEY}`
        )
        .then((restaurantsData) => console.log(restaurantsData.data))
        .catch((err) => next(err));
});

app.get('/getPlaceDetails', (req, res, next) => {
    axios
        .get(
            `https://maps.googleapis.com/maps/api/place/details/json?fields=name,editorial_summary,rating,price_level,formatted_address,opening_hours&place_id=ChIJN1t_tDeuEmsRUsoyG83frY4&key=${process.env.GOOGLE_MAPS_API_KEY}`
        )
        .then((placeData) => console.log(placeData.data))
        .catch((err) => next(err));
});

// COHERE

app.post('/signup', async (req, res, next) => {
    const cohereResult = cohereKeywordExtractor.extract(req.body.bio);
    const docRef = await addDoc(collection(db, 'users', req.body.username), {
        password: req.body.password,
        name: cohereResult.data.name,
        budget: req.body.budget + req.body.goal,
        cuisine: cohereResult.data.cuisine,
        dietary_restrictions: req.body.dietary_restrictions,
        interests: cohereResult.data.interests,
        job: cohereResult.data.job
    });
    res.send(docRef.id);
});

app.post('/login', async (req, res, next) => {
    const docRef = doc(db, 'users', req.body.username);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
        if (req.body.password === docSnap.data().password) {
            console.log('WORKED', docRef.id);
            res.send(docRef.id);
        } else {
            console.log('Incorrect password.');
        }
    } else {
        console.log('No such document!');
    }
});

app.post('/explainMatch', async (req, res, next) => {
    const user = await getUserInfo(db, req.body.userId);
    const match = await getUserInfo(db, req.body.matchId);
    const { userName, userCuisine, userInterests, userJob } = user.data;
    const [userInterest1, userInterest2, userInterest3] = userInterests;
    const { matchName, matchCuisine, matchInterests, matchJob } = match.data;
    const [matchInterest1, matchInterest2, matchInterest3] = matchInterests;
    cohereMatchExplainer
        .explain(
            userName,
            userCuisine,
            userInterest1,
            userInterest2,
            userInterest3,
            userJob,
            matchName,
            matchCuisine,
            matchInterest1,
            matchInterest2,
            matchInterest3,
            matchJob
        )
        .then((result) => console.log(result))
        .catch((err) => next(err));
});

app.listen(8000, () => {
    console.log('Server running on port 8000');
});

module.exports = app;
