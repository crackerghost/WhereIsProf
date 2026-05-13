import { useCallback, useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  RiQrScan2Line,
  RiCloseLine,
  RiCameraFill,
  RiUser3Fill,
} from 'react-icons/ri';
import { Html5Qrcode } from 'html5-qrcode';
import { Card, Button, Input } from '../components/ui';
import * as api from '../services/api';
import { useAuth } from '../hooks/useAuth';

const QRScanner = ({ onScan, onClose }) => {
  useEffect(() => {
    const scanner = new Html5Qrcode('qr-reader');
    let mounted = true;

    const startScanner = async () => {
      try {
        await scanner.start(
          { facingMode: 'environment' },
          { fps: 10, qrbox: { width: 250, height: 250 }, aspectRatio: 1 },
          async (decodedText) => {
            if (!mounted) return;
            await scanner.stop().catch(() => {});
            await scanner.clear().catch(() => {});
            onScan(decodedText);
          },
          () => {}
        );
      } catch {
        try {
          const cameras = await Html5Qrcode.getCameras();
          if (!cameras?.length) return;
          await scanner.start(
            { deviceId: { exact: cameras[0].id } },
            { fps: 10, qrbox: { width: 250, height: 250 }, aspectRatio: 1 },
            async (decodedText) => {
              if (!mounted) return;
              await scanner.stop().catch(() => {});
              await scanner.clear().catch(() => {});
              onScan(decodedText);
            },
            () => {}
          );
        } catch {
          return;
        }
      }
    };

    startScanner();

    return () => {
      mounted = false;
      scanner.stop().catch(() => {});
      scanner.clear().catch(() => {});
    };
  }, [onScan]);

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/90 backdrop-blur-xl">
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-lg bg-zinc-950 border border-zinc-800 rounded-3xl overflow-hidden">
        <div className="p-6 border-b border-zinc-900 flex justify-between items-center">
          <div>
            <h2 className="text-white font-black uppercase text-lg">Scan Attendance QR</h2>
          </div>
          <button onClick={onClose} className="p-2 bg-zinc-900 rounded-xl text-zinc-400 hover:text-white">
            <RiCloseLine size={20} />
          </button>
        </div>
        <div className="p-6">
          <div id="qr-reader" className="rounded-2xl overflow-hidden border border-zinc-800 bg-black aspect-square" />
          <div className="mt-4 flex items-center justify-center gap-2 text-zinc-500 text-[10px] uppercase tracking-widest font-black">
            <RiCameraFill /> Align QR in frame
          </div>
        </div>
      </motion.div>
    </div>
  );
};

const Attendance = () => {
  const { user } = useAuth();
  const [isScanning, setIsScanning] = useState(false);
  const [timetable, setTimetable] = useState([]);
  const [attendanceRows, setAttendanceRows] = useState([]);
  const [selectedSessionId, setSelectedSessionId] = useState('');
  const [totalStudents, setTotalStudents] = useState('');
  const [activeSession, setActiveSession] = useState(null);
  const [qrToken, setQrToken] = useState('');
  const [summary, setSummary] = useState(null);
  const [busy, setBusy] = useState(false);
  const [showQrFullscreen, setShowQrFullscreen] = useState(false);

  const qrImageUrl = useMemo(() => {
    if (!qrToken) return '';
    return `https://quickchart.io/qr?size=320&text=${encodeURIComponent(qrToken)}`;
  }, [qrToken]);

  const loadTimetable = useCallback(async () => {
    const { data } = await api.getTimetable();
    setTimetable(data);
  }, []);

  const loadAttendance = useCallback(async () => {
    const { data } = await api.getAttendance();
    setAttendanceRows(data);
  }, []);

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      loadTimetable().catch(() => {});
      loadAttendance().catch(() => {});
    }, 0);
    return () => clearTimeout(timeoutId);
  }, [loadTimetable, loadAttendance]);

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

    return () => {
      clearInterval(tokenInterval);
      clearInterval(summaryInterval);
    };
  }, [activeSession?._id, fetchSummary, user?.role]);

  const handleStartAttendance = async () => {
    if (!selectedSessionId || !totalStudents) return;
    setBusy(true);
    try {
      const { data } = await api.startAttendanceSession({
        classSessionId: selectedSessionId,
        totalStudents: Number(totalStudents),
      });
      setActiveSession(data.attendanceSession);
      setQrToken(data.qrToken);
      await fetchSummary(data.attendanceSession._id);
    } catch (error) {
      alert(error.response?.data?.message || 'Failed to start attendance');
    } finally {
      setBusy(false);
    }
  };

  const handleScan = async (decodedText) => {
    setIsScanning(false);
    try {
      await api.scanAttendanceQr(decodedText);
      alert('Attendance marked successfully');
      await loadAttendance();
    } catch (error) {
      alert(error.response?.data?.message || 'Invalid QR');
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

  return (
    <div className="space-y-8 pb-20">
      <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4 md:gap-6">
        <div className="min-w-0">
          <h1 className="text-4xl font-black text-white uppercase tracking-tight">Attendance</h1>
          <p className="text-zinc-500 text-sm">QR-based live attendance tracking</p>
        </div>
        {user?.role === 'student' && (
          <Button
            onClick={() => setIsScanning(true)}
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
            <h2 className="text-white font-black uppercase">Start Today Attendance</h2>
            <select
              className="w-full h-12 bg-black border border-zinc-900 rounded-xl px-4 text-xs uppercase tracking-widest text-zinc-300"
              value={selectedSessionId}
              onChange={(e) => setSelectedSessionId(e.target.value)}
            >
              <option value="">Select timetable class</option>
              {timetable.map((item) => (
                <option key={item._id} value={item._id}>
                  {item.subject} · {item.day} · {item.startTime}-{item.endTime} · {item.classGroup?.name || 'Class'}
                </option>
              ))}
            </select>
            <Input
              label="Total Students"
              type="number"
              value={totalStudents}
              onChange={(e) => setTotalStudents(e.target.value)}
              className="bg-black border-zinc-900"
            />
            <Button
              onClick={handleStartAttendance}
              disabled={!selectedSessionId || !totalStudents || busy}
              className="w-full h-12 uppercase text-[10px] tracking-widest font-black"
            >
              {busy ? 'Starting...' : 'Start Attendance'}
            </Button>
            {activeSession && <p className="text-zinc-500 text-[10px] uppercase tracking-widest">Live session started for {activeSession.subject}</p>}
          </Card>

          <Card className="p-6 border-zinc-900 bg-zinc-950/40 xl:mt-0">
            <h2 className="text-white font-black uppercase mb-4">Live QR (refreshes every 10s)</h2>
            {qrImageUrl ? (
              <div className="flex flex-col items-center gap-4">
                <img src={qrImageUrl} alt="Attendance QR" className="w-full max-w-[320px] rounded-2xl border border-zinc-800 bg-white p-3" />
                <Button
                  onClick={() => setShowQrFullscreen(true)}
                  className="h-11 px-5 text-[10px] font-black uppercase tracking-[0.2em]"
                >
                  Open Fullscreen QR
                </Button>
              </div>
            ) : (
              <p className="text-zinc-600 text-sm">Start attendance to render QR.</p>
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
            {summary.attendees.length === 0 && <p className="text-zinc-600 text-sm">No scans yet.</p>}
          </div>
        </Card>
      )}

      {user?.role === 'student' && (
        <Card className="p-6 border-zinc-900 bg-zinc-950/40 space-y-3">
          <h2 className="text-white font-black uppercase">Your Present Records</h2>
          {studentRows.map((row) => (
            <div key={row.id} className="p-3 rounded-xl bg-black border border-zinc-900">
              <p className="text-white font-bold">{row.subject}</p>
              <p className="text-zinc-500 text-xs">{row.date}</p>
            </div>
          ))}
          {studentRows.length === 0 && <p className="text-zinc-600 text-sm">No attendance entries yet.</p>}
        </Card>
      )}

      <AnimatePresence>
        {isScanning && <QRScanner onScan={handleScan} onClose={() => setIsScanning(false)} />}
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
                Live Attendance QR
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
