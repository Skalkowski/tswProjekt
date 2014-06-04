$(function() {
    if (window.location.search) {
        $(function() {
            $("#zlyLogin").hide();
            $("#zlyLogin").empty();

            $("#zlyLogin").append("<p>Podałeś błędy login i/lub hasło</p>");

            $("#zlyLogin").show("slow");
            var timer = setTimeout(function() {
                $("#zlyLogin").hide("slow");
            }, 3000);
        });
    }
});