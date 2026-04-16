const APP_ID = "baefb30754bf450889736922e6bf2ff4";

let uid = sessionStorage.getItem('uid');
if (!uid) {
    uid = String(Math.floor(Math.random() * 10000));
    sessionStorage.setItem('uid', uid);
}

let client;
let localTracks = [];
let remoteUsers = {};
let localScreenTracks;
let sharingScreen = false;

const queryString = window.location.search;
const urlParams = new URLSearchParams(queryString);
let roomId = urlParams.get('room') || 'main';

// ================= JOIN ROOM =================
let joinRoomInit = async () => {
    client = AgoraRTC.createClient({ mode: 'rtc', codec: 'vp8' });

    await client.join(APP_ID, roomId, null, uid);

    client.on('user-published', handleUserPublished);
    client.on('user-left', handleUserLeft);

    console.log("Joined room:", roomId);
};

// ================= JOIN STREAM =================
let joinStream = async () => {
    if (!client) {
        alert("Chưa kết nối xong!");
        return;
    }

    document.getElementById('join-btn').style.display = 'none';
    document.getElementsByClassName('stream__actions')[0].style.display = 'flex';

    localTracks = await AgoraRTC.createMicrophoneAndCameraTracks();

    let player = `
        <div class="video__container" id="user-container-${uid}">
            <div class="video-player" id="user-${uid}"></div>
        </div>
    `;

    document.getElementById('streams__container').insertAdjacentHTML('beforeend', player);

    localTracks[1].play(`user-${uid}`);

    await client.publish([localTracks[0], localTracks[1]]);
};

// ================= HANDLE REMOTE =================
let handleUserPublished = async (user, mediaType) => {
    remoteUsers[user.uid] = user;

    await client.subscribe(user, mediaType);

    let player = document.getElementById(`user-container-${user.uid}`);

    if (!player) {
        player = `
            <div class="video__container" id="user-container-${user.uid}">
                <div class="video-player" id="user-${user.uid}"></div>
            </div>
        `;
        document.getElementById('streams__container').insertAdjacentHTML('beforeend', player);
    }

    if (mediaType === 'video') {
        user.videoTrack.play(`user-${user.uid}`);
    }

    if (mediaType === 'audio') {
        user.audioTrack.play();
    }
};

let handleUserLeft = (user) => {
    delete remoteUsers[user.uid];
    let item = document.getElementById(`user-container-${user.uid}`);
    if (item) item.remove();
};

// ================= CONTROLS =================
let toggleMic = async (e) => {
    let btn = e.currentTarget;
    if (localTracks[0].muted) {
        await localTracks[0].setMuted(false);
        btn.classList.add('active');
    } else {
        await localTracks[0].setMuted(true);
        btn.classList.remove('active');
    }
};

let toggleCamera = async (e) => {
    let btn = e.currentTarget;
    if (localTracks[1].muted) {
        await localTracks[1].setMuted(false);
        btn.classList.add('active');
    } else {
        await localTracks[1].setMuted(true);
        btn.classList.remove('active');
    }
};

// ================= SCREEN SHARE =================
let toggleScreen = async (e) => {
    let btn = e.currentTarget;

    if (!sharingScreen) {
        sharingScreen = true;
        btn.classList.add('active');

        localScreenTracks = await AgoraRTC.createScreenVideoTrack();

        await client.unpublish([localTracks[1]]);
        await client.publish([localScreenTracks]);

        localScreenTracks.play(`user-${uid}`);
    } else {
        sharingScreen = false;
        btn.classList.remove('active');

        await client.unpublish([localScreenTracks]);
        await client.publish([localTracks[1]]);

        localTracks[1].play(`user-${uid}`);
    }
};

// ================= LEAVE =================
let leaveStream = async () => {
    for (let track of localTracks) {
        track.stop();
        track.close();
    }

    await client.leave();

    document.getElementById('streams__container').innerHTML = '';
    document.getElementById('join-btn').style.display = 'block';
};

// ================= EVENTS =================
document.getElementById('join-btn').addEventListener('click', joinStream);
document.getElementById('leave-btn').addEventListener('click', leaveStream);
document.getElementById('mic-btn').addEventListener('click', toggleMic);
document.getElementById('camera-btn').addEventListener('click', toggleCamera);
document.getElementById('screen-btn').addEventListener('click', toggleScreen);

// INIT
joinRoomInit();
