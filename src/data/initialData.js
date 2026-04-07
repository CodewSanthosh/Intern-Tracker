export const INITIAL_USERS = [
  {
    id: 'user1',
    email: 'intern@demo.com',
    password: 'demo123',
    type: 'intern',
    hasProfile: true,
    internData: {
      id: '1',
      name: 'Priya Sharma',
      college: 'Anna University - CEG Campus',
      email: 'intern@demo.com',
      totalDays: 45,
      createdDate: '2026-01-15',
      department: 'Computer Science',
      supervisor: 'Dr. Ramanathan',
      periods: {
        1: {
          target: 'Learn React basics and component lifecycle',
          days: {
            1: {
              progress: 'Completed React tutorial, built first component',
              file: null,
              comment: 'Good start! Focus on hooks next.',
            },
            2: {
              progress: 'Implemented useState and useEffect hooks',
              file: null,
              comment: 'Excellent progress!',
            },
            3: {
              progress: 'Built a todo app with local storage',
              file: null,
              comment: '',
            },
          },
        },
        2: {
          target: 'Build a dashboard with data visualization',
          days: {
            8: {
              progress: 'Set up project structure and routing',
              file: null,
              comment: 'Clean architecture!',
            },
            9: {
              progress: 'Integrated Chart.js for data visualization',
              file: null,
              comment: '',
            },
          },
        },
      },
    },
  },
  {
    id: 'user2',
    email: 'teacher@demo.com',
    password: 'demo123',
    type: 'teacher',
    name: 'Dr. Ramanathan',
  },
];


