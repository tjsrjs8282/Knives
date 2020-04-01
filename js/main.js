/*============click action start===========*/
var video = document.getElementById("slider");

	$(".toggleMenu").click(function(){
		$(".toggleMenu").toggleClass('active');
	});

	$(".topmenu > ul > li > a").click(function(e){
		$(".topmenu > ul > li > a").removeClass('active');
		$(this).addClass('active');
		 e.preventDefault();
	});

	$(".synopsisBtn").click(function(){
		video.pause();
		$(".action").removeClass('cast gallery trailer');
		$(".action").addClass('synopsis');
	});

	$(".castBtn").click(function(){
		video.pause();
		$(".action").removeClass('synopsis gallery trailer');
		$(".action").addClass('cast');
	});

	$(".galleryBtn").click(function(){
		video.pause();
		$(".action").removeClass('synopsis cast trailer');
		$(".action").addClass('gallery');
	});

	$(".trailerBtn").click(function(){
		$(".action").removeClass('synopsis cast gallery');
		$(".action").addClass('trailer');
	});

	$(".bottomMenu").click(function(){
		$(".snsBtn").toggleClass('active');
		$(".bottomMenu").toggleClass('active');
	});

	$(".navigation > li").click(function(){
		$(".navigation > li").removeClass('active');
		$(this).addClass('active');
	});

	$(".videoListBtn").click(function(){
		$(".navigation").toggleClass('active');
		$(".videoListBtn").toggleClass('active');
	});

	$(".castInvestigate").click(function(){
		$(".action").addClass('investigate');
	});

	$(".castInvestigate2").click(function(){
		$(".action").addClass('more');
	});

	$(".castInvestigate3").click(function(){
		$(".action").removeClass('investigate more');
	});

	$(".videoImage").click(function(){
		var audio = document.getElementById("audio-player");
		$('body').removeClass("audio-on");
		$('body').addClass("audio-off");
		audio.pause();
		$(this).fadeOut();
		slider.play();
	});

	$(".right").click(function(){
		var spList = $(".navSpan > span.active").index();
		$(".navSpan > span").removeClass('active');
		if(spList < 3){
		$(".navSpan > span").eq(spList+1).addClass('active');
		}else if (spList == 3){
		$(".navSpan > span").eq(0).addClass('active');
		}
	});

	$(".left").click(function(){
		var spList = $(".navSpan > span.active").index();
		$(".navSpan > span").removeClass('active');
		if(spList >= 0){
		$(".navSpan > span").eq(spList-1).addClass('active');
		}else if (spList == 0){
		$(".navSpan > span").eq(3).addClass('active');
		}
	});

	$(".container > ul > li > img").click(function(){
		$(".container > ul > li > img").removeClass('active');
		$(this).addClass('active');
	});
/*============click action end============*/

/*============resize & scroll action start===========*/	
	function resize() {
		  var vheight = $(window).height();
		  var vwidth = $(window).width();
		  $('.section').css({
		    'height': vheight,
		    'width': vwidth 
		  });
		};

		$(window).resize(function(){
		  resize();
		});

		$("html").mousemove(function(){
			resize();
			action();
		});

	function action(){
			var hheight = $("html").scrollTop();
			//console.log(scroll);
			if (hheight > 200) {
				//console.log('a');
				$(".action").addClass("black");
			}
			else {
				//console.log('a');
				$(".action").removeClass("black");
			}
		};
/*============resize & scroll action end===========*/	

/*================ost sound start==============*/		
if($(window).length) {
	var audio = document.getElementById("audio-player");
    audio.volume = 0.2;
		$('body').addClass("audio-on");
		if ($('body').hasClass('audio-off')) {
        	$('body').removeClass('audio-on');
		} 
		$(".soundBtnWrap").on('click', function() {
			$('body').toggleClass("audio-on audio-off");         
				if ($('body').hasClass('audio-off')) {
				audio.pause();}

				if ($('body').hasClass('audio-on')) {
				audio.play();
			}
		});
		$(".sound_fiexdIcon").click(function(){
			$(".ostMusic_Wrap").toggleClass('active');
		});
		$(".music_closeBtn").click(function(){
			$(".ostMusic_Wrap").removeClass('active');
		});
	}

	function videoURL(hmmm){
		var audio = document.getElementById("audio-player");
		var video = document.getElementById("slider");
		video.volume = 0.4;
		document.getElementById("slider").src = hmmm;

		$('body').removeClass("audio-on");
		$('body').addClass("audio-off");
		audio.pause();
		$(".videoImage").fadeOut();
		video.play();
		}
/*=================ost sound end================*/

/*==============gallery slider start==============*/
var current = 0;

	 $(".right").click(function(){
		if(current <= 3){		
			current++;
			if(current ==4){current = 0;};
		}
		move();
	});

	$(".left").click(function(){
		if(current >= 0){
			current--;
			if(current == -1){current = 3;};
		} 
		move();
	});

	function move(){
		var num = current * 1110 * -1;
		$(".container > ul").stop().animate({left:num},300);
	}

	$(".thumb").click(function(){
		var i = $(this).index();
		$("#image > p").hide().eq(i).fadeIn();
		$(".container > ul").animate({left:num},300);
	});
 /*==============gallery slider end==============*/