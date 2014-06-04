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

            console.log("Do poprawy: " + data);
            for (var i = 0; i < Object.keys(data).length; i++) {
                var postac;
                if (data[i].postac === undefined || data[i].name === $scope.user) {
                    console.log("test postaci przed gotowe  " + data[i].postac);
                    postac = "";
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

        //po nacisnieciu start wysyłanie info do servera
        $('#gotowosc').click(function() {
            socket.emit('gotowy');

        });
        //czekanie az wszyscy portwierdza
        socket.on('czekanie', function(ilosc) {
            $('#panelGotowosci').append("<p> Czekamy na " + ilosc + "graczy </p>");
        });

        //start gry po potwierdzeniu gotowowości przez wszystkich graczy
        socket.on('startGry', function() {
            $('#panelGotowosci').empty();
            $('#gra').show();
        });



        //rozgry


        socket.on('pytasz', function(pytajacy) {
            console.log(pytajacy);
            if ($scope.userzy[pytajacy].name == $scope.user) {
                console.log($scope.user + " pyta");
                $('input[name=ostPytanie]').attr('checked', false);
                $('#pytaszPanel').show();
                $scope.id = pytajacy;
            }
            $scope.$digest();
        });


        $scope.sendMsg = function() {

            if ($scope.msg && $scope.msg.text) {
                pytanie = $scope.msg.text;
                socket.emit('send msg', $scope.msg.text);
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
            }
        };


        socket.on('pytanie do odpowiedzi', function(pytanie) {
            console.log(pytanie);
            $('#odpowiadaszPanel').show();
            $('#pytanie').text(pytanie + "?");
            $('#buttonTak').removeAttr("disabled");
            $('#buttonNie').removeAttr("disabled");
            $('#buttonNieWiem').removeAttr("disabled");
        });

        $scope.odpTak = function() {
            socket.emit('odpowiedz', 'tak');
            blokujOdp();
        };

        $scope.odpNie = function() {
            socket.emit('odpowiedz', 'nie');
            blokujOdp();
        };

        $scope.odpNieWiem = function() {
            socket.emit('odpowiedz', 'nieWiem');
            blokujOdp();
        };


        var blokujOdp = function() {
            $('#buttonTak').attr("disabled", "disabled");
            $('#buttonNie').attr("disabled", "disabled");
            $('#buttonNieWiem').attr("disabled", "disabled");
            $('#odpowiadaszPanel').hide();
        };

        //odebranie odpowiedzi koncowej
        socket.on('wyslij odpKoncowa', function(odpKoncowa, pytajacy, koncowe) {
            if ($scope.userzy[pytajacy].name == $scope.user) {
                var odp = pytanie + " " + odpKoncowa;
                if (koncowe) {
                    console.log("dostalem odp na koncowe pytanie");
                    if (odpKoncowa === 'tak') {
                        alert('Zgadles!!!!!');
                    } else {
                        alert('probuj dalej');
                    }
                } else {
                    console.log("dostalem odp na normalne pytanie");
                }
                $scope.msgs.unshift(odp);
                socket.emit('nastepnePytanie');
            }
            $scope.$digest();
        });

        //wylogowanie po odświeżaniu
        socket.on('wylogowanie', function() {
            window.location = '/login.html';
        });

        //przyciski Menu
        $('#autorMenu').click(function() {
            czyscMenu();
            $('#autorMenu').addClass("active");
            $('#panelAutor').show();
        });

        $('#graMenu').click(function() {
            czyscMenu();
            $('#graMenu').addClass("active");
            $('#panelGra').show();

        });
        $('#opisMenu').click(function() {
            czyscMenu();
            $('#opisMenu').addClass("active");
            $('#panelOpis').show();
        });

        var czyscMenu = function() {
            $('#panelGra').hide();
            $('#panelOpis').hide();
            $('#panelAutor').hide();
            $('#autorMenu').removeClass();
            $('#opisMenu').removeClass();
            $('#graMenu').removeClass();
        };
    }
]);