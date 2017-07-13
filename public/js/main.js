'use strict';

// ID myVideo のVideoタグを取得
const myVideoElement = $('#myVideo')[0];
const remoteVideoElement = $('#remoteVideo')[0];
const mySdpTextElement = $('#mySdpText');
const remoteSdpTextElement = $('#remoteSdpText');

(async () => {
  let peerConnection = null;
  let localStream = null;

  try {
    // カメラ、マイクを取得
    localStream = await navigator.mediaDevices.getUserMedia(
      {video: true, audio: true}
    );
    myVideoElement.srcObject = localStream;
  } catch (e) {
    console.error(e);
    $('#modalBody').html(
      `<h1 class="text-center">Fail Media Access</h1>` +
      `<h2 class="text-center">${e.toString()}</h2>`
    );
    $('#myModal').modal({'backdrop': 'static'});
  }
  $('#btnConnect').click(() => {
    // 発呼側からOffer送信
    if (! peerConnection) {
      makeOffer();
    }
  });

  function sendSdp(sessionDescription) {
    mySdpTextElement.val(sessionDescription.sdp);
    socket.emit('signaling', {
      to: $('#remoteId').val(),
      from: socket.id,
      payload: JSON.stringify(sessionDescription),
    });
  }

  function makeOffer() {
    peerConnection = prepareNewConnection();
    peerConnection.createOffer()
      .then((sessionDescription) => {
        console.log('createOffer() succsess in promise');
        return peerConnection.setLocalDescription(sessionDescription);
      }).then(function() {
      console.log('setLocalDescription() succsess in promise');
    }).catch(function(err) {
      console.error(err);
    });
  }
  function setOffer(sessionDescription) {
    if (peerConnection) {
      console.error('peerConnection alreay exist!');
    }
    peerConnection = prepareNewConnection();
    peerConnection.setRemoteDescription(sessionDescription)
      .then(() => {
        console.log('setRemoteDescription(offer) succsess in promise');
        makeAnswer();
      }).catch(function(err) {
      console.error('setRemoteDescription(offer) ERROR: ', err);
    });
  }
  function makeAnswer() {
    console.log('sending Answer. Creating remote session description...' );
    if (! peerConnection) {
      console.error('peerConnection NOT exist!');
      return;
    }
    peerConnection.createAnswer()
      .then((sessionDescription) => {
        console.log('createAnswer() succsess in promise');
        return peerConnection.setLocalDescription(sessionDescription);
      }).then(() => {
      console.log('setLocalDescription() succsess in promise');
    }).catch(function(err) {
      console.error(err);
    });
  }
  function setAnswer(sessionDescription) {
    if (! peerConnection) {
      console.error('peerConnection NOT exist!');
      return;
    }
    peerConnection.setRemoteDescription(sessionDescription)
      .then(function() {
        console.log('setRemoteDescription(answer) succsess in promise');
      }).catch(function(err) {
      console.error('setRemoteDescription(answer) ERROR: ', err);
    });
  }
  function prepareNewConnection() {
    let peer = new RTCPeerConnection(
      {'iceServers': []}
    );
    peer.ontrack = (event) => {
      // 相手側のメディア・ストリームを設定
      remoteVideoElement.srcObject = event.streams[0];
    };
    peer.onicecandidate = (evt) => {
      if (evt.candidate) {
        // ICE 収集中
        console.log(evt.candidate);
      } else {
        console.log('Empty ICE');
        // ICE収集完了
        sendSdp(peerConnection.localDescription);
      }
    };
    peer.onnegotiationneeded = function() {
      console.log('onnegotiationneeded()');
    };
    peer.onicecandidateerror = (evt) => {
      console.error('ICE candidate ERROR:', evt);
    };
    peer.onsignalingstatechange = function() {
      console.log('== signaling status=' + peer.signalingState);
    };
    peer.oniceconnectionstatechange = function() {
      console.log(
        '== ice connection status=' + peer.iceConnectionState
      );
      if (peerConnection.iceConnectionState === 'disconnected') {
        console.log('-- disconnected --');
      }
    };
    peer.onicegatheringstatechange = function() {
      console.log('==***== ice gathering state=' + peer.iceGatheringState);
    };
    peer.onconnectionstatechange = function(event) {
      console.log('==***== connection state=' + peer.connectionState);
    };
    peer.onremovestream = function(event) {
      console.log('-- peer.onremovestream()');
      remoteVideoElement.srcObject = null;
    };
    if (localStream) {
      peer.addStream(localStream);
    }
    return peer;
  }

  const socket = io.connect();
  socket.on('connect', () => {
    console.log('io connect', socket.id);
    $('#myid').text(socket.id);
  });
  socket.on('log', (data) => {
    console.log('io event log: ', data);
  });
  socket.on('signaling', (data) => {
    console.log('io event signaling: ', data);
    const remoteSdp = JSON.parse(data.payload);
    if (remoteSdp.type === 'offer') {
      console.log('Received offer ...');

      $('#remoteId').val(data.from);
      remoteSdpTextElement.val(remoteSdp.sdp);
      const offerSessionDescription = new RTCSessionDescription(remoteSdp);
      setOffer(offerSessionDescription);
    } else if (remoteSdp.type === 'answer') {
      remoteSdpTextElement.val(remoteSdp.sdp);
      console.log('Received answer ...');
      const answerSessionDescription = new RTCSessionDescription(remoteSdp);
      setAnswer(answerSessionDescription);
    }
  });
  socket.on('connect_error', (error) => {
    console.error('io connect_error: ', error);
  });
  socket.on('connect_timeout', (timeout) => {
    console.log('io connect_timeout: ', timeout);
  });
  socket.on('error', (error) => {
    console.error('io error: ', error);
  });
  socket.on('disconnect', (reason) => {
    console.log('io disconnect: ', reason);
  });
  socket.on('reconnect', (attempt) => {
    console.log('io reconnect: ', attempt);
  });
  socket.on('reconnect_attempt', (attempt) => {
    console.log('io reconnect_attempt: ', attempt);
  });
  socket.on('reconnecting', (attempt) => {
    console.log('io reconnecting: ', attempt);
  });
  socket.on('reconnect_error', (error) => {
    console.error('io reconnect_error: ', error);
  });
  socket.on('reconnect_failed', () => {
    console.error('io reconnect_failed');
  });
  socket.on('ping', () => {
    // console.log('io ping');
  });
  socket.on('pong', (ms) => {
    // console.log('io pong: ', ms);
  });
})();
