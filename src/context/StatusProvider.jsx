import { useState, useEffect, useCallback } from 'react';
import { StatusContext } from './StatusContext';
import * as api from '../services/api';
import { useAuth } from '../hooks/useAuth';
import { getSocket, resetSocket } from '../services/socket';

export const StatusProvider = ({ children }) => {
  const { user } = useAuth();
  const [professors, setProfessors] = useState([]);
  const [loading, setLoading] = useState(false);

  const fetchProfessors = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const { data } = await api.getFaculty();
      setProfessors(data);
    } catch (error) {
      console.error("Failed to fetch faculty", error);
    }
    setLoading(false);
  }, [user]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchProfessors();
  }, [fetchProfessors]);

  useEffect(() => {
    if (!user?.token) {
      resetSocket();
      return;
    }

    const socket = getSocket(user.token);
    const handleStatusUpdate = (payload) => {
      const updates = Array.isArray(payload) ? payload : [payload];
      setProfessors((prev) =>
        prev.map((prof) => {
          const update = updates.find((entry) => {
            const incomingId =
              entry?.facultyId?.toString?.() ||
              entry?.facultyId?.$oid ||
              entry?.facultyId;
            return String(incomingId) === String(prof._id);
          });
          if (!update) return prof;
          return {
            ...prof,
            status: update.status,
            classroomNumber: update.classroomNumber,
            classroomFloor: update.classroomFloor,
          };
        })
      );
    };

    const handleConnect = () => {
      fetchProfessors();
    };

    socket.off('faculty:status', handleStatusUpdate);
    socket.on('faculty:status', handleStatusUpdate);
    socket.off('connect', handleConnect);
    socket.on('connect', handleConnect);

    if (!socket.connected) {
      socket.connect();
    }

    return () => {
      socket.off('faculty:status', handleStatusUpdate);
      socket.off('connect', handleConnect);
    };
  }, [fetchProfessors, user?.token]);

  const updateStatus = async (profId, newStatus) => {
    try {
      const { data } = await api.updateFacultyProfile({ status: newStatus });
      setProfessors((prev) =>
        prev.map((prof) => (String(prof._id) === String(data._id) ? { ...prof, ...data } : prof))
      );
      return true;
    } catch (error) {
      console.error("Failed to update status", error);
      return false;
    }
  };

  const updateCabin = async (profId, cabin) => {
    try {
      const { data } = await api.updateFacultyProfile(cabin);
      setProfessors((prev) =>
        prev.map((prof) => (String(prof._id) === String(data._id) ? { ...prof, ...data } : prof))
      );
      return true;
    } catch (error) {
      console.error("Failed to update cabin", error);
      return false;
    }
  };

  return (
    <StatusContext.Provider value={{ professors, updateStatus, updateCabin, loading, refreshProfessors: fetchProfessors }}>
      {children}
    </StatusContext.Provider>
  );
};
