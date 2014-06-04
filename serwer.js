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

var graczPytajacy = 0;
var userzy = {}; //zbior userow
var postacie = []; //tablica postaci
var historyy = []; // historia chatu
var odp = 0; //zliczanie odpowiedzi tak/nie
var licznikOdp = 0; //licznik zliczajacy ilosc otrzemanych odpowiedzi na pytanie
var ostatecznePytanie = false;
var wyszliWgrze = [];


//baza danych redis
var redis = require("redis"),
    client = redis.createClient();



//pobieranie postaci z bazy i dodawanie do tabeli postacieTab
var getPostacie = function() {
    var postacieTab = [];
    client.lrange("postacie", 0, 100, function(err, reply) {
        console.log(err);
        postacie = reply;
    });
    var i = 0;
    for (var j = 0; j <= postacie.length; j++) {
        postacieTab[i] = postacie[j];
        i++;
    }

    return postacieTab;
};

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
                console.log(err);
                if (reply !== null && reply.toString() === password) {
                    console.log("user OK");
                    var d = new Date();
                    userzy[id] = {
                        name: username,
                        gotowy: false
                    };
                    client.rpush("LOG", username + ": " + d, function() {
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
        body += '<a href="/logout">Wyloguj</a>';
    } else {
        body += '<a href="/login">Zaloguj</a>';
    }
    body += '</body></html>';
    res.send(body);
});

app.get('/login', function(req, res) {

    res.redirect('/login.html');
});

// wywolanie strony login metoda post
app.post('/login',
    passport.authenticate('local', {
        failureRedirect: '/login.html?b=-1'
    }),
    function(req, res) {
        res.redirect('/authorized.html');
    }
);

app.get('/logout', function(req, res) {
    console.log('Wylogowanie...');
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
        res.redirect('/login');
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

sio.set('log level', 1); // 3 == DEBUG, 2 == INFO, 1 == WARN, 0 == ERROR

//przydzielanie postaci każdemu graczowi
var przydzielPostacie = function() {
    var postacie = getPostacie();

    for (var i = 0; i < Object.keys(userzy).length; i++) {
        var wylosowana = Math.floor(Math.random() * 1000) % postacie.length;
        userzy[i].postac = postacie[wylosowana];
        console.log(userzy[i].postac + "  test random");
        postacie.splice(wylosowana, 1);
    }
};

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
                wyszliWgrze[myId] = 1;
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



        //otrzymanie od klienta sygnalu o tym ze ma byc nastepne pytanie
        socket.on('nastepnePytanie', function() {
            graczPytajacy = graczPytajacy + 1;
            var flaga = false;


            if (graczPytajacy >= Object.keys(userzy).length) {
                graczPytajacy = 0;
                flaga = true;
            }

            while (wyszliWgrze[graczPytajacy] === 1) {
                graczPytajacy++;

                if (graczPytajacy >= Object.keys(userzy).length)
                    graczPytajacy = 0;
            }

            console.log("gracz pytajacy " + graczPytajacy + " " + Object.keys(userzy).length);
            sio.sockets.emit('pytasz', graczPytajacy);
        });


        //otrzymanie pytania od klienta
        socket.on('wyslanie pytania', function(pytanie, jakie) {
            console.log("Pytanie tu: " + pytanie);
            var pytanie2 = userzy[myId].postac + ": " + pytanie;
            if (jakie) {
                console.log("ostateczne pytanie: " + pytanie2);
                ostatecznePytanie = true;
            } else {
                console.log("normalne pytanie: " + pytanie2);
                ostatecznePytanie = false;
            }
            socket.broadcast.emit('pytanie do odpowiedzi', pytanie2);
        });

        //otrzymalem odp od klienta
        socket.on('odpowiedz', function(odpowiedz) {
            console.log(odpowiedz);
            var odpKoncowa;
            if (odpowiedz === "tak") {
                odp++;
            } else if (odpowiedz === "nie") {
                odp--;
            }
            licznikOdp++;
            console.log("ocena: " + odp + " licznik odpowiedzi: " + licznikOdp);
            if (licznikOdp == Object.keys(userzy).length - 1) {
                if (odp >= 0) {
                    console.log("pozytywna odpowiedz");
                    odpKoncowa = 'tak';
                } else {
                    console.log("negatywna odpowiedz");
                    odpKoncowa = 'nie';
                }
                if (ostatecznePytanie) {
                    sio.sockets.emit('wyslij odpKoncowa', odpKoncowa, graczPytajacy, true);
                } else {
                    sio.sockets.emit('wyslij odpKoncowa', odpKoncowa, graczPytajacy, false);
                }
                odp = 0;
                licznikOdp = 0;
            }

        });

        /** 
         * Chat
         */
        socket.on('send msg', function(data) {
            var m = userzy[myId].name + ": " + data;
            console.log(m);
            historyy.unshift(m);
            sio.sockets.emit('rec msg', m);
        });

        // zliczanie graczy, sprawdzanie czy jest odpowiednia ilosc, wysylanie odpowiedniego komunikatu jak jest, odpowiedniego jak nie ma
        socket.on('gotowy', function() {
            gotowy++;
            userzy[myId].gotowy = true;
            var pozostalo = 0;
            console.log('gotowych graczy:' + gotowy);
            if (gotowy === Object.keys(userzy).length) {
                przydzielPostacie();
                sio.sockets.emit('startGry');
                sio.sockets.emit('gracze', userzy);

                console.log("wybralem gracza");
                sio.sockets.emit('pytasz', graczPytajacy);


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