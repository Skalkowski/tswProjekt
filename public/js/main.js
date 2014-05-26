var app = angular.module('czatApka', []);

app.factory('socket', function () {
    var socket = io.connect('http://' + location.host);
    return socket;
});

app.controller('chatCtrlr', ['$scope', 'socket',
    function ($scope, socket) {

        $scope.msgs = [];
        $scope.user = "";

        $scope.sendMsg = function () {
            if ($scope.msg && $scope.msg.text) {
                socket.emit('send msg', $scope.msg.text);
                $scope.msg.text = '';
            }
        };

        $scope.wyswietlNik = function () {
                return '*** ' + $scope.user +  ' ***';
        };

        socket.on('history', function (data) {
            $scope.msgs = data;
            $scope.$digest();
        });

        socket.on('username', function (data) {
            $scope.user = data;
            $scope.$digest();
        });


        socket.on('rec msg', function (data) {
            $scope.msgs.unshift(data);
            $scope.$digest();
        });
    }
]);