import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  RiQrScan2Line,
  RiCloseLine,
  RiCameraFill,
  RiUser3Fill,
} from 'react-icons/ri';
import { Html5Qrcode } from 'html5-qrcode';
import { Card, Button } from '../components/ui';
import * as api from '../services/api';
import { useAuth } from '../hooks/useAuth';
import { getSocket } from '../services/socket';
import PageSkeleton from '../components/PageSkeleton';
import { useToast } from '../hooks/useToast';

const getTodayDateInputValue = () => {
  const now = new Date();
  const tzOffsetMs = now.getTimezoneOffset() * 60000;
  return new Date(now.getTime() - tzOffsetMs).toISOString().slice(0, 10);
};

const getDayNameFromDateInput = (dateValue) => {
  if (!dateValue) return '';
  const date = new Date(`${dateValue}T00:00:00`);
  return new Intl.DateTimeFormat('en-US', { weekday: 'long' }).format(date);
};

const SubjectAttendanceRing = ({ percentage }) => {
  const safePercentage = Math.max(0, Math.min(100, Number(percentage) || 0));
  const radius = 28;
  const circumference = 2 * Math.PI * radius;
  const dashOffset = circumference - (safePercentage / 100) * circumference;

  return (
    <div className="relative h-20 w-20 shrink-0">
      <svg className="h-20 w-20 -rotate-90" viewBox="0 0 72 72">
        <circle cx="36" cy="36" r={radius} stroke="#27272a" strokeWidth="8" fill="none" />
        <circle
          cx="36"
          cy="36"
          r={radius}
          stroke="#f4f4f5"
          strokeWidth="8"
          strokeLinecap="round"
          fill="none"
          strokeDasharray={circumference}
          strokeDashoffset={dashOffset}
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="text-xs font-black text-white">{safePercentage}%</span>
      </div>
    </div>
  );
};

const QRScanner = ({ onScan, onClose, onWarn }) => {
  const [scanError, setScanError] = useState('');
  const scannerRef = useRef(null);
  const startedRef = useRef(false);
  const scannedRef = useRef(false);

  const safeStopAndClear = useCallback(async () => {
    try {
      if (startedRef.current && scannerRef.current) {
        await scannerRef.current.stop().catch(() => {});
      }
      if (scannerRef.current) {
        await scannerRef.current.clear().catch(() => {});
      }
    } catch {
      return;
    }
  }, []);

  useEffect(() => {
    const scanner = new Html5Qrcode('qr-reader');
    scannerRef.current = scanner;
    let mounted = true;
    startedRef.current = false;
    scannedRef.current = false;

    const startWithConfig = async (cameraConfig) => {
      await scanner.start(
        cameraConfig,
        {
          fps: 10,
          qrbox: { width: 260, height: 260 },
          aspectRatio: 1,
          disableFlip: false,
        },
        async (decodedText) => {
          if (!mounted || scannedRef.current) return;
          scannedRef.current = true;
          // Trigger scan completion immediately so UI never gets stuck on black scanner screen.
          onScan(decodedText);
          safeStopAndClear();
        },
        () => {}
      );
      startedRef.current = true;
    };

    const startScanner = async () => {
      try {
        setScanError('');
        const cameras = await Html5Qrcode.getCameras();
        if (cameras?.length) {
          const rearCamera =
            cameras.find((cam) => /back|rear|environment/i.test(cam.label || '')) || cameras[0];
          await startWithConfig({ deviceId: { exact: rearCamera.id } });
          return;
        }
        await startWithConfig({ facingMode: { ideal: 'environment' } });
      } catch (primaryError) {
        try {
          await startWithConfig({ facingMode: 'environment' });
        } catch {
          if (!mounted) return;
          const message = primaryError?.message || 'Camera could not be started.';
          const finalMessage = `${message} Check browser camera permission and try again.`;
          setScanError(finalMessage);
          onWarn?.(finalMessage);
        }
      }
    };

    const timeoutId = setTimeout(() => {
      startScanner();
    }, 120);

    return () => {
      mounted = false;
      scannedRef.current = true;
      clearTimeout(timeoutId);
      safeStopAndClear();
    };
}, [onScan, safeStopAndClear, onWarn]);

  const handleClose = async () => {
    await safeStopAndClear();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-4 pt-[max(env(safe-area-inset-top),12px)] pb-[max(env(safe-area-inset-bottom),12px)] bg-black/90 backdrop-blur-xl">
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-lg max-h-[92dvh] bg-zinc-950 border border-zinc-800 rounded-3xl overflow-hidden flex flex-col">
        <div className="p-4 sm:p-6 border-b border-zinc-900 flex justify-between items-center shrink-0">
          <div>
            <h2 className="text-white font-black uppercase text-base sm:text-lg">Scan Attendance QR</h2>
          </div>
          <button type="button" onClick={handleClose} className="p-2 bg-zinc-900 rounded-xl text-zinc-400 hover:text-white">
            <RiCloseLine size={20} />
          </button>
        </div>
        <div className="p-4 sm:p-6 overflow-y-auto custom-scrollbar">
          <div id="qr-reader" className="rounded-2xl overflow-hidden border border-zinc-800 bg-black aspect-square w-full max-w-[420px] mx-auto" />
          {scanError && (
            <p className="mt-4 text-red-400 text-xs font-semibold">
              {scanError}
            </p>
          )}
          <div className="mt-4 flex items-center justify-center gap-2 text-zinc-500 text-[10px] uppercase tracking-widest font-black">
            <RiCameraFill /> Align QR in frame
          </div>
        </div>
      </motion.div>
    </div>
  );
};

const FaceVerificationGate = ({ user, faceEnrolled, onVerified, onClose, onWarn, onSuccess, onEnrolled }) => {
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [noncePayload, setNoncePayload] = useState(null);
  const [captureState, setCaptureState] = useState('Hold steady, then blink and turn slightly.');
  const [localFaceEnrolled, setLocalFaceEnrolled] = useState(faceEnrolled || user?.faceEnrollmentStatus === 'enrolled');
  const [mirrorPreview, setMirrorPreview] = useState(false);

  const stopCamera = useCallback(() => {
    const stream = streamRef.current;
    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
  }, []);

  useEffect(() => {
    let mounted = true;
    const start = async () => {
      try {
        const { data } = await api.startFaceVerification();
        if (!mounted) return;
        setNoncePayload({ nonce: data.nonce, nonceToken: data.nonceToken });
        if (!navigator?.mediaDevices?.getUserMedia) {
          throw new Error('Camera API unavailable. Use HTTPS on mobile or test from localhost.');
        }
        const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' }, audio: false });
        if (!mounted) {
          stream.getTracks().forEach((track) => track.stop());
          return;
        }
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
        }
      } catch (err) {
        const msg = err?.response?.data?.message || err?.message || 'Unable to start face verification';
        setError(msg);
        onWarn?.(msg);
      }
    };
    start();
    return () => {
      mounted = false;
      stopCamera();
    };
  }, [onWarn, stopCamera]);

  const captureFrameSequence = async (count = 10, intervalMs = 140) => {
    const video = videoRef.current;
    if (!video || !video.videoWidth || !video.videoHeight) {
      throw new Error('Camera feed is not ready');
    }

    const maxWidth = 360;
    const scale = Math.min(1, maxWidth / video.videoWidth);
    const outWidth = Math.max(180, Math.round(video.videoWidth * scale));
    const outHeight = Math.max(180, Math.round(video.videoHeight * scale));

    const canvas = document.createElement('canvas');
    canvas.width = outWidth;
    canvas.height = outHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Unable to access camera frame');

    const frames = [];
    for (let i = 0; i < count; i += 1) {
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      frames.push(canvas.toDataURL('image/jpeg', 0.58));
      await new Promise((resolve) => setTimeout(resolve, intervalMs));
    }
    return frames;
  };

  const handleEnroll = async () => {
    setBusy(true);
    setError('');
    try {
      setCaptureState('Capturing enrollment frames...');
      const images = await captureFrameSequence(4, 180);
      await api.enrollFace(images);
      setLocalFaceEnrolled(true);
      onEnrolled?.();
      setCaptureState('Enrollment complete. Blink and turn slightly before verify.');
    } catch (err) {
      const msg = err?.response?.data?.message || err?.message || 'Face enrollment failed';
      setError(msg);
      onWarn?.(msg);
    } finally {
      setBusy(false);
    }
  };

  const handleVerify = async () => {
    if (!noncePayload) return;
    setBusy(true);
    setError('');
    try {
      setCaptureState('Capturing verification frames... Blink once and turn slightly.');
      const images = await captureFrameSequence(8, 140);
      const { data } = await api.verifyFace({
        images,
        nonce: noncePayload.nonce,
        nonceToken: noncePayload.nonceToken,
      });
      onSuccess?.('Face verified successfully');
      onVerified(data.faceVerificationToken);
    } catch (err) {
      const msg = err?.response?.data?.message || err?.message || 'Face verification failed';
      setError(msg);
      onWarn?.(msg);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[105] flex items-center justify-center p-2 sm:p-4 pt-[max(env(safe-area-inset-top),10px)] pb-[max(env(safe-area-inset-bottom),10px)] bg-black/90 backdrop-blur-xl">
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-2xl max-h-[96dvh] bg-zinc-950 border border-zinc-800 rounded-3xl overflow-hidden flex flex-col">
        <div className="p-4 sm:p-6 border-b border-zinc-900 flex justify-between items-center shrink-0">
          <h2 className="text-white font-black uppercase text-base sm:text-lg">Face Verification</h2>
          <button type="button" onClick={onClose} className="p-2 bg-zinc-900 rounded-xl text-zinc-400 hover:text-white">
            <RiCloseLine size={20} />
          </button>
        </div>
        <div className="p-4 sm:p-6 space-y-4 overflow-y-auto custom-scrollbar">
          <video
            ref={videoRef}
            muted
            playsInline
            className="w-full rounded-2xl border border-zinc-800 bg-black object-cover min-h-[300px] sm:min-h-[360px] md:min-h-[420px]"
            style={{ transform: mirrorPreview ? 'scaleX(-1)' : 'scaleX(1)' }}
          />
          <button
            type="button"
            onClick={() => setMirrorPreview((prev) => !prev)}
            className="w-full h-10 rounded-xl border border-zinc-800 bg-black text-zinc-300 text-[10px] font-black uppercase tracking-widest"
          >
            {mirrorPreview ? 'Disable Mirror Preview' : 'Enable Mirror Preview'}
          </button>
          <p className="text-zinc-500 text-[10px] uppercase tracking-widest">
            {captureState}
          </p>
          {!localFaceEnrolled ? (
            <Button disabled={busy} onClick={handleEnroll} className="w-full h-12 uppercase text-[10px] tracking-widest font-black">
              {busy ? 'Enrolling...' : 'Enroll Face ID'}
            </Button>
          ) : (
            <Button disabled={busy} onClick={handleVerify} className="w-full h-12 uppercase text-[10px] tracking-widest font-black">
              {busy ? 'Verifying...' : 'Verify & Continue'}
            </Button>
          )}
          {error && <p className="text-red-400 text-xs font-semibold">{error}</p>}
        </div>
      </motion.div>
    </div>
  );
};

const Attendance = () => {
  const { user } = useAuth();
  const toast = useToast();
  const [isScanning, setIsScanning] = useState(false);
  const [timetable, setTimetable] = useState([]);
  const [attendanceRows, setAttendanceRows] = useState([]);
  const [selectedSessionId, setSelectedSessionId] = useState('');
  const [selectedFacultyDate, setSelectedFacultyDate] = useState(getTodayDateInputValue());
  const [activeSession, setActiveSession] = useState(null);
  const [qrToken, setQrToken] = useState('');
  const [summary, setSummary] = useState(null);
  const [studentSummary, setStudentSummary] = useState([]);
  const [busy, setBusy] = useState(false);
  const [showQrFullscreen, setShowQrFullscreen] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [showFaceGate, setShowFaceGate] = useState(false);
  const [faceVerificationToken, setFaceVerificationToken] = useState('');
  const [faceVerificationExpiresAt, setFaceVerificationExpiresAt] = useState(0);
  const [faceEnrolledOverride, setFaceEnrolledOverride] = useState(false);
  const isFaceEnrolled = faceEnrolledOverride || user?.faceEnrollmentStatus === 'enrolled';

  const qrImageUrl = useMemo(() => {
    if (!qrToken) return '';
    return `https://quickchart.io/qr?size=320&text=${encodeURIComponent(qrToken)}`;
  }, [qrToken]);

  const selectedFacultyDay = useMemo(
    () => getDayNameFromDateInput(selectedFacultyDate),
    [selectedFacultyDate]
  );

  const filteredFacultyTimetable = useMemo(
    () =>
      timetable.filter((item) => String(item?.day || '').trim().toLowerCase() === selectedFacultyDay.toLowerCase()),
    [selectedFacultyDay, timetable]
  );

  const loadTimetable = useCallback(async () => {
    const { data } = await api.getTimetable();
    setTimetable(data);
  }, []);

  const loadAttendance = useCallback(async () => {
    const { data } = await api.getAttendance();
    setAttendanceRows(data);
  }, []);

  const loadStudentSummary = useCallback(async () => {
    if (user?.role !== 'student') return;
    const { data } = await api.getStudentAttendanceSummary();
    setStudentSummary(Array.isArray(data) ? data : []);
  }, [user?.role]);

  useEffect(() => {
    const timeoutId = setTimeout(async () => {
      try {
        await Promise.all([
          loadTimetable().catch(() => {}),
          loadAttendance().catch(() => {}),
          loadStudentSummary().catch(() => {}),
        ]);
      } finally {
        setInitialLoading(false);
      }
    }, 0);
    return () => clearTimeout(timeoutId);
  }, [loadTimetable, loadAttendance, loadStudentSummary]);

  const fetchSummary = useCallback(async (sessionId) => {
    const { data } = await api.getAttendanceSessionSummary(sessionId);
    setSummary(data);
  }, []);

  useEffect(() => {
    if (!activeSession?._id || user?.role !== 'faculty') return undefined;

    const tokenInterval = setInterval(async () => {
      try {
        const { data } = await api.refreshAttendanceSessionToken(activeSession._id);
        setQrToken(data.qrToken);
      } catch {
        return;
      }
    }, 10000);

    const summaryInterval = setInterval(() => {
      fetchSummary(activeSession._id).catch(() => {});
    }, 5000);

    const socket = getSocket(user?.token);
    const onAttendanceMarked = (payload) => {
      if (payload?.attendanceSessionId === activeSession._id) {
        fetchSummary(activeSession._id).catch(() => {});
      }
    };
    socket.on('attendance:marked', onAttendanceMarked);

    return () => {
      clearInterval(tokenInterval);
      clearInterval(summaryInterval);
      socket.off('attendance:marked', onAttendanceMarked);
    };
  }, [activeSession?._id, fetchSummary, user?.role, user?.token]);

  const handleStartAttendance = async () => {
    if (!selectedSessionId) return;
    setBusy(true);
    try {
      const { data } = await api.startAttendanceSession({
        classSessionId: selectedSessionId,
      });
      setActiveSession(data.attendanceSession);
      setQrToken(data.qrToken);
      await fetchSummary(data.attendanceSession._id);
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to start attendance');
    } finally {
      setBusy(false);
    }
  };

  const handleScan = async (decodedText) => {
    setIsScanning(false);
    try {
      const token = String(decodedText || '').trim();
      const { data } = await api.scanAttendanceQr(token, faceVerificationToken);
      toast[data?.alreadyMarked ? 'warning' : 'success'](
        data?.alreadyMarked ? 'Attendance already marked for this session' : 'Attendance marked successfully'
      );
      await loadAttendance();
      await loadStudentSummary();
    } catch (error) {
      if (error?.response?.status === 401) {
        setFaceVerificationToken('');
        setFaceVerificationExpiresAt(0);
      }
      toast.error(error.response?.data?.message || 'Invalid QR');
    }
  };

  const handleStopAttendance = async () => {
    if (!activeSession?._id) return;
    setBusy(true);
    try {
      await api.stopAttendanceSession(activeSession._id);
      await fetchSummary(activeSession._id);
      setActiveSession((prev) => (prev ? { ...prev, active: false } : prev));
      setQrToken('');
      setShowQrFullscreen(false);
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to stop attendance');
    } finally {
      setBusy(false);
    }
  };

  const studentRows = useMemo(
    () =>
      attendanceRows
        .filter((row) => row.status === 'Present')
        .map((row) => ({
          id: row._id,
          subject: row.subject,
          date: new Date(row.createdAt || row.date).toLocaleString(),
        })),
    [attendanceRows]
  );

  if (initialLoading) return <PageSkeleton />;

  return (
    <div className="space-y-8 pb-20">
      <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4 md:gap-6">
        <div className="min-w-0">
          <h1 className="text-4xl font-black text-white uppercase tracking-tight">Attendance</h1>
          <p className="text-zinc-500 text-sm">Mark and review your class attendance</p>
        </div>
        {user?.role === 'student' && (
          <Button
            onClick={() => {
              const hasValidFaceGrant = faceVerificationToken && faceVerificationExpiresAt > Date.now();
              if (hasValidFaceGrant) {
                setIsScanning(true);
                return;
              }
              setShowFaceGate(true);
            }}
            className="h-14 md:h-12 w-full md:w-auto px-6 uppercase text-[10px] tracking-widest font-black flex flex-col md:flex-row items-center justify-center gap-0.5 md:gap-2"
          >
            <RiQrScan2Line className="h-6 w-6 md:h-4 md:w-4" />
            <span>Scan QR</span>
          </Button>
        )}
      </div>

      {user?.role === 'faculty' && (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          <Card className="p-6 border-zinc-900 bg-zinc-950/40 space-y-4">
            <h2 className="text-white font-black uppercase">Start Attendance</h2>
            <div>
              <label className="text-zinc-500 text-[10px] font-black uppercase tracking-widest block mb-2">Select Date</label>
              <input
                type="date"
                value={selectedFacultyDate}
                onChange={(e) => {
                  setSelectedFacultyDate(e.target.value);
                  setSelectedSessionId('');
                }}
                className="w-full h-12 bg-black border border-zinc-900 rounded-xl px-4 text-xs uppercase tracking-widest text-zinc-300"
              />
            </div>
            <select
              className="w-full h-12 bg-black border border-zinc-900 rounded-xl px-4 text-xs uppercase tracking-widest text-zinc-300"
              value={selectedSessionId}
              onChange={(e) => setSelectedSessionId(e.target.value)}
            >
              <option value="">{`Select a class (${selectedFacultyDay || 'day'})`}</option>
              {filteredFacultyTimetable.map((item) => (
                <option key={item._id} value={item._id}>
                  {item.subject} · {item.startTime}-{item.endTime} · {item.classGroup?.name || 'Class'}
                </option>
              ))}
            </select>
            {filteredFacultyTimetable.length === 0 && (
              <p className="text-zinc-500 text-xs">No classes scheduled on this date.</p>
            )}
            <p className="text-zinc-500 text-xs">
              The student count is taken from the class roster automatically.
            </p>
            <Button
              onClick={handleStartAttendance}
              disabled={!selectedSessionId || busy}
              className="w-full h-12 uppercase text-[10px] tracking-widest font-black"
            >
              {busy ? 'Starting...' : 'Start Attendance'}
            </Button>
            {activeSession && (
              <div className="space-y-3">
                <p className="text-zinc-500 text-[10px] uppercase tracking-widest">
                  {activeSession.active === false ? 'Attendance closed' : `Live session started for ${activeSession.subject}`}
                </p>
                <Button
                  onClick={handleStopAttendance}
                  disabled={busy || activeSession.active === false}
                  variant="danger"
                  className="w-full h-12 uppercase text-[10px] tracking-widest font-black"
                >
                  {busy ? 'Stopping...' : activeSession.active === false ? 'Attendance Closed' : 'Stop Attendance'}
                </Button>
              </div>
            )}
          </Card>

          <Card className="p-6 border-zinc-900 bg-zinc-950/40 xl:mt-0">
            <h2 className="text-white font-black uppercase mb-4">Attendance QR (refreshes every 10s)</h2>
            {qrImageUrl ? (
              <div className="flex flex-col items-center gap-4">
                <img src={qrImageUrl} alt="Attendance QR" className="w-full max-w-[320px] rounded-2xl border border-zinc-800 bg-white p-3" />
                <Button
                  onClick={() => setShowQrFullscreen(true)}
                  className="h-11 px-5 text-[10px] font-black uppercase tracking-[0.2em]"
                >
                  Open Fullscreen
                </Button>
              </div>
            ) : (
              <p className="text-zinc-600 text-sm">
                {activeSession?.active === false
                  ? 'Attendance has been closed for this session.'
                  : 'Start attendance to generate the QR code.'}
              </p>
            )}
          </Card>
        </div>
      )}

      {user?.role === 'faculty' && summary && (
        <Card className="p-6 border-zinc-900 bg-zinc-950/40 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="p-4 rounded-xl bg-black border border-zinc-900">
              <p className="text-zinc-600 text-[10px] uppercase tracking-widest">Total</p>
              <p className="text-white text-2xl font-black">{summary.totalStudents}</p>
            </div>
            <div className="p-4 rounded-xl bg-black border border-zinc-900">
              <p className="text-zinc-600 text-[10px] uppercase tracking-widest">Present</p>
              <p className="text-white text-2xl font-black">{summary.presentCount}</p>
            </div>
            <div className="p-4 rounded-xl bg-black border border-zinc-900">
              <p className="text-zinc-600 text-[10px] uppercase tracking-widest">Absent</p>
              <p className="text-white text-2xl font-black">{summary.absentCount}</p>
            </div>
          </div>
          <div className="space-y-2">
            {summary.attendees.map((row) => (
              <div key={row.id} className="flex items-center justify-between p-3 rounded-xl bg-black border border-zinc-900">
                <div className="flex items-center gap-2 text-zinc-300 text-sm">
                  <RiUser3Fill /> {row.name}
                </div>
                <span className="text-zinc-500 text-[11px] font-bold uppercase">{row.usn}</span>
              </div>
            ))}
            {summary.attendees.length === 0 && <p className="text-zinc-600 text-sm">No students have marked attendance yet.</p>}
          </div>
        </Card>
      )}

      {user?.role === 'student' && (
        <Card className="p-6 border-zinc-900 bg-zinc-950/40 space-y-5">
          <h2 className="text-white font-black uppercase">Attendance by Subject</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {studentSummary.map((item) => (
              <div key={item.subject} className="p-4 rounded-2xl bg-black border border-zinc-900 space-y-3">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-white font-black uppercase tracking-wide">{item.subject}</p>
                  <SubjectAttendanceRing percentage={item.percentage} />
                </div>
                <div className="grid grid-cols-3 gap-2 text-center">
                  <div className="rounded-xl border border-zinc-900 bg-zinc-950 p-2">
                    <p className="text-zinc-500 text-[10px] uppercase">Total</p>
                    <p className="text-white font-black">{item.totalClasses}</p>
                  </div>
                  <div className="rounded-xl border border-zinc-900 bg-zinc-950 p-2">
                    <p className="text-zinc-500 text-[10px] uppercase">Marked</p>
                    <p className="text-white font-black">{item.markedClasses}</p>
                  </div>
                  <div className="rounded-xl border border-zinc-900 bg-zinc-950 p-2">
                    <p className="text-zinc-500 text-[10px] uppercase">Missed</p>
                    <p className="text-white font-black">{item.missedClasses}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
          {studentSummary.length === 0 && (
            <p className="text-zinc-600 text-sm">No attendance recorded yet.</p>
          )}
          <div className="pt-1 space-y-2">
            <p className="text-zinc-400 text-xs uppercase tracking-widest font-black">Recent entries</p>
            {studentRows.map((row) => (
              <div key={row.id} className="p-3 rounded-xl bg-black border border-zinc-900">
                <p className="text-white font-bold">{row.subject}</p>
                <p className="text-zinc-500 text-xs">{row.date}</p>
              </div>
            ))}
            {studentRows.length === 0 && <p className="text-zinc-600 text-sm">No entries yet.</p>}
          </div>
        </Card>
      )}

      <AnimatePresence>
        {showFaceGate && (
          <FaceVerificationGate
            user={user}
            faceEnrolled={isFaceEnrolled}
            onClose={() => setShowFaceGate(false)}
            onWarn={(msg) => toast.warning(msg)}
            onSuccess={(msg) => toast.success(msg)}
            onEnrolled={() => {
              setFaceEnrolledOverride(true);
              const saved = localStorage.getItem('user');
              if (saved) {
                try {
                  const parsed = JSON.parse(saved);
                  parsed.faceEnrollmentStatus = 'enrolled';
                  localStorage.setItem('user', JSON.stringify(parsed));
                } catch {
                  // no-op
                }
              }
              toast.success('Face enrollment completed');
            }}
            onVerified={(token) => {
              setFaceVerificationToken(token);
              setFaceVerificationExpiresAt(Date.now() + 2 * 60 * 1000);
              setShowFaceGate(false);
              setIsScanning(true);
            }}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isScanning && (
          <QRScanner
            onScan={handleScan}
            onClose={() => setIsScanning(false)}
            onWarn={(msg) => toast.warning(msg)}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showQrFullscreen && qrImageUrl && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[110] bg-black/95 backdrop-blur-md flex items-center justify-center p-4"
          >
            <button
              type="button"
              onClick={() => setShowQrFullscreen(false)}
              className="absolute top-5 right-5 p-3 rounded-xl bg-zinc-900 text-zinc-300 hover:text-white border border-zinc-800"
            >
              <RiCloseLine size={24} />
            </button>
            <div className="w-full max-w-[900px] flex flex-col items-center gap-6">
              <h2 className="text-white font-black uppercase tracking-[0.2em] text-sm md:text-base text-center">
                Attendance QR
              </h2>
              <img
                src={qrImageUrl}
                alt="Attendance QR Fullscreen"
                className="w-full max-w-[760px] rounded-3xl border border-zinc-700 bg-white p-5"
              />
              <p className="text-zinc-500 text-[10px] md:text-xs uppercase tracking-[0.2em] font-black text-center">
                Refreshes every 10 seconds
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default Attendance;
