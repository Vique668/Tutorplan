import { Award, ChevronDown, Clock3, Flame, Target, TrendingUp, Users } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { StatCard } from "@/components/ui/stat-card";

const activity = [45, 58, 52, 72, 61, 78, 84, 70, 88, 91, 82, 94];
const subjects = [
  { name: "Математика", count: 29, percent: 52, color: "orange" },
  { name: "Физика", count: 17, percent: 31, color: "purple" },
  { name: "Геометрия", count: 9, percent: 17, color: "green" },
];

export default function StatisticsPage() {
  return (
    <div className="page-stack">
      <PageHeader title="Статистика" description="Результаты работы и динамика занятий" actions={<Button variant="secondary" icon={<ChevronDown size={18} />}>Август 2026</Button>} />
      <div className="stats-grid">
        <StatCard label="Проведено уроков" value="55" note="↑ 8 к прошлому месяцу" icon={<Target size={21} />} />
        <StatCard label="Учебных часов" value="62,5" note="В среднем 15,6 в неделю" icon={<Clock3 size={21} />} tone="blue" />
        <StatCard label="Посещаемость" value="94%" note="2 отмены за месяц" icon={<Users size={21} />} tone="green" />
        <StatCard label="Серия без отмен" value="12 дней" note="Личный рекорд — 18" icon={<Flame size={21} />} tone="purple" />
      </div>
      <div className="statistics-grid">
        <Card className="activity-card">
          <div className="card-toolbar"><div><h2>Активность занятий</h2><p>Количество проведённых часов по неделям</p></div><Badge tone="green"><TrendingUp size={14} /> +16%</Badge></div>
          <div className="line-chart">
            <div className="chart-y"><span>20 ч</span><span>15 ч</span><span>10 ч</span><span>5 ч</span><span>0</span></div>
            <div className="line-area">
              <svg viewBox="0 0 660 220" preserveAspectRatio="none" aria-label="Рост числа занятий">
                <defs><linearGradient id="area" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#ff9f43" stopOpacity=".28" /><stop offset="1" stopColor="#ff9f43" stopOpacity="0" /></linearGradient></defs>
                <path className="area-fill" d={`M0,${220-activity[0]*2} ${activity.map((p,i)=>`L${i*60},${220-p*2}`).join(" ")} L660,220 L0,220 Z`} />
                <path className="chart-line" d={`M0,${220-activity[0]*2} ${activity.map((p,i)=>`L${i*60},${220-p*2}`).join(" ")}`} />
                {activity.map((p,i)=><circle key={i} cx={i*60} cy={220-p*2} r={i===11?6:3.5} />)}
              </svg>
              <div className="chart-x"><span>1 нед</span><span>2 нед</span><span>3 нед</span><span>4 нед</span></div>
            </div>
          </div>
        </Card>
        <Card className="subjects-card">
          <div className="card-toolbar"><div><h2>По предметам</h2><p>55 уроков в августе</p></div></div>
          <div className="donut-wrap"><div className="donut-chart"><div><strong>55</strong><span>уроков</span></div></div></div>
          <div className="subject-list">{subjects.map((subject)=><div key={subject.name}><span className={`subject-dot subject-${subject.color}`} /><strong>{subject.name}</strong><span>{subject.count}</span><small>{subject.percent}%</small></div>)}</div>
        </Card>
      </div>
      <Card className="achievement-card"><span className="achievement-icon"><Award size={24} /></span><div><Badge tone="orange">НОВОЕ ДОСТИЖЕНИЕ</Badge><h3>50 занятий за месяц!</h3><p>Отличный темп — это на 17% больше вашего среднего результата.</p></div><Button variant="secondary">Посмотреть достижения</Button></Card>
    </div>
  );
}
