var app = angular.module('Karteczki', []);

app.factory('socket', function () {
    var socket = io.connect('http://' + location.host);
    return socket;
});


app.controller('chatCtrlr', ['$scope', 'socket',
    function ($scope, socket) {
        $scope.msgs = [];
        $scope.connected = false;
        $scope.czylogin = false;
        $scope.login = "";
        $scope.sendMsg = function () {
            if ($scope.msg && $scope.msg.text) {
                socket.emit('send msg', $scope.login.text + " " + $scope.msg.text);
                $scope.msg.text = '';
            }
        };
        socket.on('connect', function () {
            $scope.connected = true;
            $scope.$digest();
        });
        socket.on('history', function (data) {
            $scope.msgs = data;
            $scope.$digest();
        });
        socket.on('rec msg', function (data) {
            $scope.msgs.unshift(data);
            $scope.$digest();
        });

        $scope.sendLogin = function(){
            if ($scope.login && $scope.login.text) {
                socket.emit('send login', $scope.login.text);
                $scope.czylogin = true;
            }
        }


    }
]);
