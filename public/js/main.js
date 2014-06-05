var app = angular.module('karteczki', []);

app.factory('socket', function() {
    var socket = io.connect('http://' + location.host);
    return socket;
});

app.controller('chatCtrlr', ['$scope', 'socket',
    function($scope, socket) {

        $('#gra').hide();
        $('#panelAutor').hide();
        $('#panelOpis').hide();
        $('#gotowosc').attr("disabled", "disabled");
        $scope.msgs = [];
        $scope.user = "";
        $scope.userzy = {};
        $('#pytaszPanel').hide();
        $('#odpowiadaszPanel').hide();
        $('#czekaniePoOdp').hide();


        $scope.id = 0;
        var pytanie = "";
        //wyswietlenie nicku
        $scope.wyswietlNik = function() {
            return $scope.user;
        };

        //odebranie i przypisanie swojego loginu
        socket.on('username', function(data) {
            $scope.user = data;
            $scope.$digest();
        });

        //drukowanie tabelki z graczami
        socket.on('gracze', function(data) {
            $scope.userzy = data;
            console.log(data);
            $('tbody').empty();
            var iterator = 1;

            for (var i = 0; i < Object.keys(data).length; i++) {
                var postac;

                if (data[i].postac === undefined || data[i].name === $scope.user) {
                    console.log("test postaci przed gotowe  " + data[i].postac);
                    postac = "Zgaduj ;)";
                } else {
                    console.log("test postaci po gotowe " + data[i].postac);
                    postac = data[i].postac;
                }
                $('tbody').append("<tr><td>" + iterator + "</td><td>" + data[i].name + "</td><td>" + postac + "</td></tr>");
                iterator++;

            }

            $scope.$digest();
        });

        // kiedy okreslona liczba graczy bedzie, przycisk jest dostepny
        socket.on('guzikStart', function(data) {
            if (data) {
                $('#gotowosc').removeAttr("disabled");
            } else {
                $('#gotowosc').attr("disabled", "disabled");
            }
            $scope.$digest();
        });

        //po nacisnieciu gotowy wysyłanie info do servera
        $('#gotowosc').click(function() {
            socket.emit('gotowy');
            $('#gotowosc').attr("disabled", "disabled");
        });

        //czekanie az wszyscy portwierdza przez przycisk gotowy
        socket.on('czekanie', function(ilosc) {
            $('#panelGotowosci').append("<p> Czekamy na " + ilosc + "graczy </p>");
        });

        //start gry po potwierdzeniu gotowowości przez wszystkich graczy
        socket.on('startGry', function() {
            $('#panelGotowosci').hide();
            $('#gra').show();
        });

        //dostaje sygnal od serwera o zadanie pytania, jesli moja kolej to zadaje
        socket.on('pytasz', function(pytajacy) {
            $('#czekaniePoOdp').show();
            console.log(pytajacy);
            $('#czekaniePoOdp').text('Zadaj pytanie');
            if ($scope.userzy[pytajacy].name == $scope.user) {
                $('#czekaniePoOdp').text('Napisz pytanie');
                console.log($scope.user + " pyta");
                $('input[name=ostPytanie]').attr('checked', false);
                $('#pytaszPanel').show();
                $scope.id = pytajacy;
            } else
                $('#czekaniePoOdp').text('Czekaj na pytanie');
            $scope.$digest();

        });

        //wyslanie pytania do serwera; sprawdzenie czy zgadywanie postaci
        $scope.sendMsg = function() {
            if ($scope.msg && $scope.msg.text) {
                pytanie = $scope.msg.text;
                socket.emit('wyslanie pytania', $scope.msg.text);
                $('#pytaszPanel').hide();
                if ($('input[name=ostPytanie]').is(':checked')) {
                    console.log("zadalem ostateczne pytanie!!!!!!!");
                    socket.emit('wyslanie pytania', $scope.msg.text, true);
                } else {
                    socket.emit('wyslanie pytania', $scope.msg.text, false);
                    console.log("zadalem normalne pytanie");
                }
                $scope.msg.text = '';
                $('#czekaniePoOdp').text('Czekaj na odpowiedzi');

            }
        };

        //otrzymanie pytania na ktore mam odpowiedziec
        socket.on('pytanie do odpowiedzi', function(pytanie) {
            console.log(pytanie);
            $('#odpowiadaszPanel').show();
            $('#pytanie').text(pytanie + "?");
        });


        $scope.odpTak = function() {
            socket.emit('odpowiedz', 'tak');
            odpUkr();
        };

        $scope.odpNie = function() {
            socket.emit('odpowiedz', 'nie');
            odpUkr();
        };

        $scope.odpNieWiem = function() {
            socket.emit('odpowiedz', 'nieWiem');
            odpUkr();
        };
        var odpUkr = function() {
            $('#odpowiadaszPanel').hide("slow");
            $('#czekaniePoOdp').show("slow");
        };


        //odebranie odpowiedzi koncowej
        socket.on('wyslij odpKoncowa', function(odpKoncowa, pytajacy, koncowe) {
            if ($scope.userzy[pytajacy].name === $scope.user) {
                var odp = pytanie + " " + odpKoncowa;
                if (koncowe) {
                    console.log("dostalem odp na koncowe pytanie");

                    alert('probuj dalej');

                } else {
                    console.log("dostalem odp na normalne pytanie");
                }
                $scope.msgs.unshift(odp);
                socket.emit('nastepnePytanie');
                $('#czekaniePoOdp').text('Czekaj na pytanie');
            }
            $scope.$digest();
        });

        //koniec gry
        socket.on("koniec gry", function(odpKoncowa, pytajacy) {
            if ($scope.userzy[pytajacy].name === $scope.user) {
                alert("Wygraleś!");
            } else
                alert("Przegrales");
            window.location = '/login.html';
        });

        //wylogowanie po odświeżaniu
        socket.on('wylogowanie', function() {
            window.location = '/login.html';
        });

        //przyciski Menu
        $('#autorMenu').click(function() {
            czyscMenu();
            $('#autorMenu').addClass("active");
            $('#panelAutor').show("slow");
        });

        $('#graMenu').click(function() {
            czyscMenu();
            $('#graMenu').addClass("active");
            $('#panelGra').show("slow");

        });
        $('#opisMenu').click(function() {
            czyscMenu();
            $('#opisMenu').addClass("active");
            $('#panelOpis').show("slow");
        });

        var czyscMenu = function() {
            $('#panelGra').hide("slow");
            $('#panelOpis').hide("slow");
            $('#panelAutor').hide("slow");
            $('#autorMenu').removeClass();
            $('#opisMenu').removeClass();
            $('#graMenu').removeClass();
        };
    }
]);