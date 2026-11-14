/* Course and instructor details — edit these fields for your deployment.
   Leave a field as an empty string to hide it. No logos are bundled. */
window.RIL_CONFIG = {
  courseTitle: 'Robotics and Instrumentation',
  courseCode: 'M26TJS01XX',           // shown on the Course Overview page and in reports; '' uses the syllabus value
  instructor: 'Dr Bansilal Bairwa',
  instructorEmail: 'bansilal.bairwa@reva.edu.in',
  instructorPhoto: 'assets/img/instructor.jpg',   // relative to the site root
  instructorLinkedIn: 'https://www.linkedin.com/in/dr-bansilal-bairwa-4816b2106/',
  academicYear: '',                   // e.g. 'Odd Semester 2026'
  logoUrl: ''                         // optional path to your own logo image
};

/* Instructor name, linked to the LinkedIn profile when one is set */
window.RIL_INSTRUCTOR_HTML = function () {
  const c = window.RIL_CONFIG; if (!c.instructor) return '';
  const n = String(c.instructor).replace(/[&<>"]/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[m]));
  return c.instructorLinkedIn ? `<a href="${c.instructorLinkedIn}" target="_blank" rel="noopener noreferrer" title="LinkedIn profile">${n}</a> <a class="li-badge" href="${c.instructorLinkedIn}" target="_blank" rel="noopener noreferrer" aria-label="${n} on LinkedIn">in</a>` : n;
};
