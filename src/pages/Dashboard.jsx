import { useState, useEffect } from 'react';
import { Search, Filter } from 'lucide-react';
import { useStatus } from '../hooks/useStatus';
import { ProfessorCard } from '../features/locator/ProfessorCard';
import { Input } from '../components/ui';
import PageSkeleton from '../components/PageSkeleton';
import * as api from '../services/api';

const Dashboard = () => {
  const { professors, loading } = useStatus();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDept, setSelectedDept] = useState('All');
  const [departments, setDepartments] = useState([]);
  const [deptLoading, setDeptLoading] = useState(true);

  useEffect(() => {
    const fetchDepts = async () => {
      try {
        const { data } = await api.getDepartments();
        setDepartments(data);
      } catch (error) {
        console.error("Failed to fetch departments", error);
      } finally {
        setDeptLoading(false);
      }
    };
    fetchDepts();
  }, []);

  if (loading || deptLoading) return <PageSkeleton />;

  const filteredProfessors = professors.filter((prof) => {
    const departmentNames = (prof.departments?.length
      ? prof.departments.map((dept) => dept?.name).filter(Boolean)
      : [prof.department?.name || prof.department].filter(Boolean));
    const departmentName = departmentNames.join(', ');
    const matchesSearch = prof.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         departmentName.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesDept = selectedDept === 'All' || departmentNames.includes(selectedDept);
    return matchesSearch && matchesDept;
  });

  return (
    <div className="flex flex-col h-full lg:h-[calc(100vh-160px)] space-y-6 md:space-y-8">
      {/* Header and Search - Fixed at top on desktop */}
      <div className="shrink-0 space-y-6 md:space-y-8">
        <div className="max-w-3xl space-y-3 md:space-y-4">
          <h1 className="text-3xl md:text-4xl lg:text-5xl font-black text-white tracking-tighter leading-none uppercase">
            Faculty <br className="hidden sm:block"/> <span className="text-zinc-500">Directory</span>
          </h1>
          <p className="text-zinc-500 text-sm md:text-lg font-medium max-w-xl">
            Live availability and campus location for every faculty member.
          </p>
        </div>
        
        <div className="flex flex-col md:flex-row gap-4">
          <div className="relative md:flex-[1.8] group">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-zinc-600 group-focus-within:text-white transition-colors" />
            <Input
              placeholder="Search faculty or department..."
              className="pl-12 h-14 md:h-16 bg-zinc-950 border-zinc-800 text-lg md:text-xl rounded-xl"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <div className="flex items-center bg-zinc-950 border border-zinc-800 rounded-xl px-4 h-14 md:h-16 md:w-[240px]">
            <Filter className="h-5 w-5 text-zinc-600 mr-3 shrink-0" />
            <select
              className="bg-transparent border-none text-zinc-300 font-bold text-xs md:text-sm uppercase tracking-[0.12em] focus:ring-0 focus:outline-none cursor-pointer hover:text-white transition-colors h-full pr-8 w-full"
              value={selectedDept}
              onChange={(e) => setSelectedDept(e.target.value)}
            >
              <option value="All" className="bg-zinc-950">Departments</option>
              {departments.map((dept) => (
                <option key={dept._id} value={dept.name} className="bg-zinc-950">{dept.name}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Column-wise scrollable list */}
      <div className="flex-1 lg:overflow-y-auto lg:custom-scrollbar lg:pr-2 space-y-4 min-h-0">
        <div className="flex flex-col space-y-4 pb-10 lg:pb-0">
          {filteredProfessors.map((prof) => (
            <ProfessorCard key={prof._id} prof={prof} />
          ))}
        </div>

        {filteredProfessors.length === 0 && (
          <div className="text-center py-20 bg-zinc-950/50 rounded-2xl border border-dashed border-zinc-800">
            <p className="text-zinc-600 text-xs md:text-lg font-bold uppercase tracking-widest">No faculty match your search</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default Dashboard;
