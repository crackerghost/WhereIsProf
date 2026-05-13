import { useContext } from 'react';
import { StatusContext } from '../context/StatusContext';

export const useStatus = () => useContext(StatusContext);
