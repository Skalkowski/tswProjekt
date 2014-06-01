var app = angular.module('czatApka', []);

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


        $scope.sendMsg = function() {
            s
            if ($scope.msg && $scope.msg.text) {
                socket.emit('send msg', $scope.msg.text);
                $scope.msg.text = '';
            }
        };

        $scope.wyswietlNik = function() {
            return $scope.user;
        };

        socket.on('history', function(data) {
            $scope.msgs = data;
            $scope.$digest();
        });

        socket.on('username', function(data) {
            $scope.user = data;
            $scope.$digest();
        });

        socket.on('gracze', function(data) {
            $scope.userzy = data;
            console.log(data);
            $('tbody').empty();
            var iterator = 1;

            console.log(data);
            for (var i in data) {
                $('tbody').append("<tr><td>" + iterator + "</td><td>" + data[i].name + "</td><td>postac</td></tr>");
                iterator++;
            }

            $scope.$digest();
        });

        $('#gotowosc').click(function() {
            socket.emit('gotowy');
        });





        socket.on('rec msg', function(data) {
            $scope.msgs.unshift(data);
            $scope.$digest();
        });

        //wylogowanie po odświeżaniu
        socket.on('wylogowanie', function() {
            window.location = '/login.html';

        });
        // kiedy okreslona liczba graczy bedzie, przycisk jest dostepny
        socket.on('guzikStart', function() {
            $('#gotowosc').removeAttr("disabled");
            $scope.$digest();
        });

        socket.on('gotowyOdp', function() {
            //    alert('Zaczynamy gre!!');
            $('#gra').show();
        })






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

        function czyscMenu() {
            $('#panelGra').hide();
            $('#panelOpis').hide();
            $('#panelAutor').hide();
            $('#autorMenu').removeClass();
            $('#opisMenu').removeClass();
            $('#graMenu').removeClass();
        }
    }
]);