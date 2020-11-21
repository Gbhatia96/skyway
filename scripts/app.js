//#region localMediaCode
let myStream;
async function GetStream(type) {
    try {
        var constraints;
        if (type === "video")
            constraints = { video: true, audio: true };
        else if (type === "audio")
            constraints = { audio: true };

        var stream = await navigator.mediaDevices.getUserMedia(constraints);
        myStream = stream;
        console.log(myStream);
        return stream;
    }
    catch (error) {
        console.log("GetLocalMedia Exception:-" + error);
    }

}
function SetStreamToElement(stream, elementId) {
    try {
        var elmt = document.getElementById(elementId);
        elmt.srcObject = stream;
        elmt.style.transform = "rotateY(180deg)";
        return true;
    }
    catch (err) {
        console.log(err);
        return false;
    }
}

async function SetStream(type, id) {
    var stream = await GetStream(type);
    SetStreamToElement(stream, id);
    if (document.getElementById(id).getAttribute("data-draggable").toLowerCase() == "true")
        MakeDraggable(id);
}

function StopStream(elementId) {
    document.getElementById(elementId).srcObject = null;
}
//#endregion

//#region roomCode
var socket;
var socketUrl = 'https://webrtc-signaling-tutorial.azurewebsites.net/';
socket = io(socketUrl, {
    withCredentials: false
});

var iuser;
function CreateUserObject(username, roomname, roompassword) {
    if (username != null && username != "" && roompassword != null &&
        roompassword != "" && roomname != null && roomname != "") {
        var user = {
            roomname: roomname,
            username: username,
            roompassword: roompassword,
        };
        iuser = user;
        return user;
    }
}

function CreateRoom(username, roomname, roompassword) {
    var user = CreateUserObject(username, roomname, roompassword);
    socket.emit('createRoom', user);
}

function JoinRoom(username, roomname, roompassword) {
    var user = CreateUserObject(username, roomname, roompassword);
    socket.emit('joinRoom', user);
}

function SendMessage(typeOf, message) {
    var msg = {
        type: typeOf,
        data: message
    };
    socket.send(Json.stringify(msg));
}

socket.on('msg', function (message) {
    console.log(message);
    // txt.innerHTML+=message;
});
//#endregion

//#region Webrtc

var pc;
var videoSender;


const configuration = { iceServers: [{ urls: 'stun:stun.l.google.com:19302' }] };
pc = new RTCPeerConnection(configuration);
const offerOptions = { offerToReceiveVideo: true, offerToReceiveAudio: true }

socket.on('startCall', function (message) {
    start();
});

async function start() {
    try {
        console.log("started");
        remoteVideo.style.display = "block";
        myVideo.style.display = "block";
        myStream.getTracks().forEach((track) =>
         videoSender= pc.addTrack(track, myStream));
        console.log("stream added" + myStream);
    } catch (err) {
        console.error(err);
    }
}

pc.onnegotiationneeded = async () => {
    try {
        console.log("negotiation needed");
        await pc.setLocalDescription(await pc.createOffer(offerOptions));
        // send the offer to the other peer
        console.log("negotiation offer created");
        iuser.description = pc.localDescription;
        socket.emit('sendDescription', iuser);
        console.log("local description sent");
    } catch (err) {
        console.error(err);
    }
};

pc.addEventListener('icecandidate', sendIceCandidate);
function sendIceCandidate(iceCandidateEvent) {
    console.log('sending ice candidate');
    iuser.icecandidate = iceCandidateEvent.candidate;
    if (iuser.icecandidate != undefined && iuser.icecandidate != "")
        socket.emit('sendIceCandidate', iuser);
}

socket.on('iceCandidataReceive', function (data) {
    console.log("Received IceCandidate");
    pc.addIceCandidate(new RTCIceCandidate(data.icecandidate));
    console.log("ice candidate added");
});

async function manageOffer(data) {
    var desc = data.description;
    if (desc.type === 'offer') {
        await pc.setRemoteDescription(desc);
        console.log("remote description set");
        const stream = myStream;//await navigator.mediaDevices.getUserMedia(constraints);
        stream.getTracks().forEach((track) => {
            console.log("track added");
           videoSender= pc.addTrack(track, stream);
        })
        await pc.setLocalDescription(await pc.createAnswer());
        iuser.description = pc.localDescription;
        console.log("local description sent");
        myVideo.style.display = "block";
        remoteVideo.style.display = "block";
        socket.emit("sendDescription", iuser);
    }
    else if (desc.type === 'answer') {
        console.log("remote description received");
        await pc.setRemoteDescription(desc); //await
        console.log("remote description set");
    }
    else {
        console.log('Unsupported SDP type.');
    }
}
socket.on('descriptionReceive', function (data) {
    manageOffer(data);
});

pc.ontrack = (event) => {
    // don't set srcObject again if it is already set.
    console.log("track received");
    if (remoteVideo.srcObject) return;
    remoteVideo.srcObject = event.streams[0];
    console.log("remote video set");
};

var startTime = null;
var startTimer;
pc.oniceconnectionstatechange = ev => {
    console.log(pc.iceConnectionState);
    if (pc.iceConnectionState == "disconnected") {
        Dispose();
        window.location.href = "/";
    }
    if (pc.iceConnectionState == "connected") {
        startTime = new Date().getTime();
        //startTimer=setInterval(timer,1000);
    }
}

function Dispose() {
    if (pc) {
        pc = null;
        socket.emit('exitRoom', iuser);
    }
}
function trace(text) {
    text = text.trim();
    const now = (window.performance.now() / 1000).toFixed(3);

    console.log(now, text);
}

//#endregion
function SetDisplay() {
    myVideo.style.display = "block";
    panel.style.display = "block";
}

function ExitRoom() {
    myVideo.style.display = "none";
    panel.style.display = "none";
    remoteVideo.style.display = "none";
    Dispose();
    window.location.replace("/");
}

socket.on('peerDisconnected', function (message) {
    window.location.replace("/");
});

function MuteMe() {
    if (btnmute.innerHTML == '<i class="fa fa-microphone"></i>') {
        myStream.getAudioTracks()[0].enabled = false;
        btnmute.innerHTML = '<i class="fa fa-microphone-slash"></i>'
    }
    else {
        myStream.getAudioTracks()[0].enabled = true;
        btnmute.innerHTML = '<i class="fa fa-microphone"></i>'
    }
}
