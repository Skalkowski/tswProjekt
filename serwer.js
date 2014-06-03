//biblioteki
var http = require('http');
var express = require('express');
var app = express();
var connect = require('connect');
var passport = require('passport');
var LocalStrategy = require('passport-local').Strategy;
var socketIo = require('socket.io');
var passportSocketIo = require('passport.socketio');
var sessionStore = new connect.session.MemoryStore();

var sessionSecret = 'wielkiSekret44';
var sessionKey = 'connect.sid';
var server;
var sio;
var gotowy = 0;
var id = 0;
var OGRANICZENIE = 2;
var odpowiedzial = false;
var licznik = 0;


var history = []; // historia chatu
//baza danych redis
var redis = require("redis"),
    client = redis.createClient();

var userzy = {}; //zbior obiektow
var postacie = []; //tablica postaci

//pobieranie postaci z bazy i dodawanie do tabeli postacieTab
var getPostacie = function() {
    var postacieTab = [];
    client.lrange("postacie", 0, 100, function(err, reply) {
        postacie = reply;
    });
    var i = 0;
    for (var j in postacie) {
        postacieTab[i] = postacie[j];
        i++;
    }

    return postacieTab;
}

// Konfiguracja passport.js
passport.serializeUser(function(user, done) {
    done(null, user);
});
passport.deserializeUser(function(obj, done) {
    done(null, obj);
});

//autentykacja
passport.use(new LocalStrategy(
    function(username, password, done) {
        var zalogowany = false;
        console.log("Sprawdzam usera " + username);
        for (var i in userzy) {
            if (userzy[i].name === username) {
                zalogowany = true;
                console.log("juz zalogowany");
            }
        }
        if (zalogowany) {
            return done(null, false);
        } else {
            //baza danych; wywoluje na niej get
            client.get(username, function(err, reply) {
                if (reply !== null && reply.toString() === password) {
                    console.log("user OK");
                    var d = new Date();
                    userzy[id] = {
                        name: username,
                        gotowy: false
                    }
                    client.rpush("LOG", username + ": " + d, function(err, reply) {
                        console.log("Zapis w logach");
                    });

                    return done(null, {
                        username: username,
                        password: password
                    });
                } else {
                    return done(null, false);
                }
            });
        }
    }
));

app.use(express.cookieParser());
app.use(express.urlencoded());
app.use(express.session({
    store: sessionStore,
    key: sessionKey,
    secret: sessionSecret
}));
app.use(passport.initialize());
app.use(passport.session());
app.use(express.static('public'));
app.use(express.json());
app.use(express.urlencoded());
app.use(express.multipart());

app.get('/', function(req, res) {
    var body = '<html><body>';
    var username;
    if (req.user) {
        username = req.user.username;
        body += '<p>Jesteś zalogowany jako „' + username + '”</p>';
        body += '<a href="/logout">Wyloguj</a>'
    } else {
        body += '<a href="/login">Zaloguj</a>'
    }
    body += '</body></html>'
    res.send(body);
});

app.get('/login', function(req, res) {
    res.redirect('/login.html');
});

// wywolanie strony login metoda post
app.post('/login',
    passport.authenticate('local', {
        failureRedirect: '/login'
    }),
    function(req, res) {
        res.redirect('/authorized.html');
    }
);

app.get('/logout', function(req, res) {
    console.log('Wylogowanie...')

    req.logout();
    res.redirect('/login');
});

app.post('/signup', function(req, res) {
    var username = req.body.username;
    var password = req.body.password;
    var password2 = req.body.password2;
    if (password === password2) {
        client.set(username, password, function(err, reply) {
            console.log(reply.toString());
        });
        res.redirect('/login')
    }
});

server = http.createServer(app);
sio = socketIo.listen(server);

var onAuthorizeSuccess = function(data, accept) {
    console.log('Udane połączenie z socket.io');
    accept(null, true);
};

var onAuthorizeFail = function(data, message, error, accept) {
    if (error) {
        throw new Error(message);
    }
    console.log('Nieudane połączenie z socket.io:', message);
    accept(null, false);
};

sio.set('authorization', passportSocketIo.authorize({
    passport: passport,
    cookieParser: express.cookieParser,
    key: sessionKey, // nazwa ciasteczka, w którym express/connect przechowuje identyfikator sesji
    secret: sessionSecret,
    store: sessionStore,
    success: onAuthorizeSuccess,
    fail: onAuthorizeFail
}));

sio.set('log level', 2); // 3 == DEBUG, 2 == INFO, 1 == WARN, 0 == ERROR

//przydzielanie postaci każdemu graczowi
var przydzielPostacie = function() {
    var postacie = getPostacie();

    for (var i in userzy) {
        var wylosowana = Math.floor(Math.random() * 1000) % postacie.length;
        userzy[i].postac = postacie[wylosowana];
        console.log(userzy[i].postac + "  test random");
        postacie.splice(wylosowana, 1);
    }
}

sio.sockets.on('connection', function(socket) {

    var myId = id;
    id++;
    if (userzy[myId]) {

        //wysła do klienta jego login
        socket.emit('username', userzy[myId].name);

        //usuwanie graczy
        socket.on('disconnect', function() {
            console.log("Gracz " + userzy[myId].name + " nas opuscil");
            if (userzy[myId].gotowy) {
                gotowy--;
                id--;
                console.log('usuniety user');
            }

            delete userzy[myId];
            console.log(userzy);
            if (Object.keys(userzy).length < OGRANICZENIE) {
                sio.sockets.emit('guzikStart', 2);
            }
            sio.sockets.emit('gracze', userzy);
        });

        //  socket.emit('history', history);

        //wyslanie do klienta polecenia drukowania tabelki z graczami
        sio.sockets.emit('gracze', userzy);



        //akcja
        socket.on('odpowiedzialem', function() {
            licznik = licznik + 1;
            console.log("licze" + licznik);
            console.log(userzy.length);
            if (licznik == Object.keys(userzy).length)
                licznik = 0;
            sio.sockets.emit('pytasz', licznik);
        });

        /** 
         * Chat
         */
        socket.on('send msg', function(data) {
            var m = userzy[myId].name + ": " + data;
            console.log(m);
            history.unshift(m);
            sio.sockets.emit('rec msg', m);
        });

        // zliczanie graczy, sprawdzanie czy jest odpowiednia ilosc, wysylanie odpowiedniego komunikatu jak jest, odpowiedniego jak nie ma
        socket.on('gotowy', function(data) {
            gotowy++;
            userzy[myId].gotowy = true;
            var pozostalo = 0;
            console.log('gotowych graczy:' + gotowy);
            if (gotowy === Object.keys(userzy).length) {
                przydzielPostacie();
                sio.sockets.emit('startGry');
                sio.sockets.emit('gracze', userzy);
                var pytajacy = 0;
                var i = 0;

                console.log("wybralem gracza");
                sio.sockets.emit('pytasz', licznik);


            } else {
                pozostalo = Object.keys(userzy).length - gotowy;
                socket.emit('czekanie', pozostalo);
            }
        });

        //sprawdzenie czy jest więcej niż x osob
        if (Object.keys(userzy).length >= OGRANICZENIE) {
            console.log("jest przynajmniej: " + OGRANICZENIE + " graczy");
            sio.sockets.emit('guzikStart', 1);
        }

    } else {
        socket.emit('wylogowanie');
    }
});

server.listen(3000, function() {
    getPostacie();
    console.log('Serwer pod adresem http://localhost:3000/');
});