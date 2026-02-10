import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { BookOpen, Brain, Globe, Zap, Award, Users, Sparkles, TrendingUp, Heart, ArrowRight, Star } from 'lucide-react';

export default function Home() {
  const features = [
    {
      icon: <BookOpen className="w-12 h-12" />,
      title: '160,000+ Topics',
      description: 'Comprehensive knowledge from historical newspaper archives',
      gradient: 'from-blue-500 via-blue-600 to-indigo-600',
    },
    {
      icon: <Brain className="w-12 h-12" />,
      title: 'AI-Powered Quizzes',
      description: 'Test your knowledge with intelligent adaptive questions',
      gradient: 'from-purple-500 via-purple-600 to-pink-600',
    },
    {
      icon: <Globe className="w-12 h-12" />,
      title: '12 Languages',
      description: 'Learn in Hindi, Punjabi, English, and 9 more languages',
      gradient: 'from-teal-500 via-cyan-600 to-blue-600',
    },
    {
      icon: <Zap className="w-12 h-12" />,
      title: 'Interactive Learning',
      description: 'Engaging content with summaries and translations',
      gradient: 'from-amber-500 via-orange-600 to-red-600',
    },
    {
      icon: <Award className="w-12 h-12" />,
      title: 'Track Progress',
      description: 'Monitor your learning journey with detailed analytics',
      gradient: 'from-green-500 via-emerald-600 to-teal-600',
    },
    {
      icon: <Users className="w-12 h-12" />,
      title: '100% Free',
      description: 'Quality education accessible to everyone, forever',
      gradient: 'from-rose-500 via-pink-600 to-purple-600',
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-b from-white via-gray-50 to-white dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 overflow-hidden transition-colors duration-500">
      {/* Animated Background Blobs */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
        <motion.div
          animate={{
            scale: [1, 1.2, 1],
            x: [0, 50, 0],
            y: [0, 30, 0],
          }}
          transition={{ duration: 20, repeat: Infinity, ease: "easeInOut" }}
          className="absolute top-20 -left-20 w-96 h-96 bg-gradient-to-r from-blue-400 to-cyan-400 rounded-full mix-blend-multiply dark:mix-blend-screen filter blur-3xl opacity-20 dark:opacity-10"
        />
        <motion.div
          animate={{
            scale: [1, 1.3, 1],
            x: [0, -30, 0],
            y: [0, 50, 0],
          }}
          transition={{ duration: 25, repeat: Infinity, ease: "easeInOut" }}
          className="absolute top-40 -right-20 w-96 h-96 bg-gradient-to-r from-purple-400 to-pink-400 rounded-full mix-blend-multiply dark:mix-blend-screen filter blur-3xl opacity-20 dark:opacity-10"
        />
        <motion.div
          animate={{
            scale: [1, 1.1, 1],
            x: [0, 20, 0],
            y: [0, -20, 0],
          }}
          transition={{ duration: 30, repeat: Infinity, ease: "easeInOut" }}
          className="absolute bottom-20 left-1/3 w-96 h-96 bg-gradient-to-r from-amber-400 to-orange-400 rounded-full mix-blend-multiply dark:mix-blend-screen filter blur-3xl opacity-20 dark:opacity-10"
        />
      </div>

      {/* Hero Section */}
      <section className="relative py-20 md:py-32 px-4">
        <div className="container mx-auto relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="text-center max-w-6xl mx-auto"
          >
            {/* Floating Badge */}
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.2, type: "spring" }}
              className="inline-flex items-center gap-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white px-6 py-3 rounded-full text-sm font-bold mb-8 shadow-2xl hover:shadow-blue-500/50 transition-all cursor-pointer"
            >
              <Sparkles className="w-5 h-5 animate-pulse" />
              <span>100% Free Forever • AI-Powered • 12 Languages</span>
              <Star className="w-4 h-4 fill-yellow-300 text-yellow-300" />
            </motion.div>

            {/* Main Heading with Gradient */}
            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3, duration: 0.6 }}
              className="text-6xl md:text-8xl font-black mb-6 leading-tight"
            >
              <span className="bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 bg-clip-text text-transparent">
                Welcome to
              </span>
              <br />
              <span className="bg-gradient-to-r from-cyan-500 via-blue-500 to-purple-500 bg-clip-text text-transparent">
                GyanDhara 🌊
              </span>
            </motion.h1>

            {/* Hindi Title with Animation */}
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.4, type: "spring" }}
              className="mb-8"
            >
              <p className="text-4xl md:text-5xl mb-2 hindi-text font-bold bg-gradient-to-r from-amber-500 via-orange-500 to-red-500 bg-clip-text text-transparent inline-block">
                ज्ञान धारा
              </p>
              <p className="text-2xl text-gray-600 dark:text-gray-300 font-semibold">Stream of Knowledge</p>
            </motion.div>

            {/* Description */}
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5 }}
              className="text-xl md:text-2xl mb-12 text-gray-700 dark:text-gray-200 max-w-4xl mx-auto leading-relaxed font-medium"
            >
              Transform <span className="font-black text-blue-600 dark:text-blue-400 underline decoration-blue-300 decoration-4">194 scrapbooks</span> of historical wisdom into your personal learning journey.
              <span className="font-black text-purple-600 dark:text-purple-400"> 160,000+ topics</span> across <span className="font-black text-pink-600 dark:text-pink-400">18 themes</span>, powered by cutting-edge AI.
            </motion.p>

            {/* CTA Buttons */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6 }}
              className="flex gap-6 justify-center flex-wrap mb-12"
            >
              <Link to="/themes">
                <motion.button
                  whileHover={{ scale: 1.05, y: -3 }}
                  whileTap={{ scale: 0.98 }}
                  className="group relative bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 text-white font-bold text-xl px-12 py-6 rounded-2xl shadow-2xl hover:shadow-purple-500/50 transition-all duration-300 overflow-hidden"
                >
                  <span className="relative z-10 flex items-center gap-3">
                    Start Learning Now
                    <ArrowRight className="w-6 h-6 group-hover:translate-x-2 transition-transform" />
                  </span>
                  <motion.div
                    className="absolute inset-0 bg-gradient-to-r from-purple-600 via-pink-600 to-red-600"
                    initial={{ x: '100%' }}
                    whileHover={{ x: 0 }}
                    transition={{ duration: 0.3 }}
                  />
                </motion.button>
              </Link>
              <Link to="/signup">
                <motion.button
                  whileHover={{ scale: 1.05, y: -3 }}
                  whileTap={{ scale: 0.98 }}
                  className="bg-white dark:bg-gray-800 text-gray-800 dark:text-white hover:text-blue-600 dark:hover:text-blue-400 font-bold text-xl px-12 py-6 rounded-2xl shadow-xl hover:shadow-2xl transition-all duration-300 border-4 border-gray-200 dark:border-gray-600 hover:border-blue-400 dark:hover:border-blue-500 flex items-center gap-2"
                >
                  Sign Up Free
                  <Sparkles className="w-5 h-5" />
                </motion.button>
              </Link>
            </motion.div>

            {/* Trust Indicators */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.8 }}
              className="flex items-center justify-center gap-8 flex-wrap text-base text-gray-600 font-semibold"
            >
              <div className="flex items-center gap-2 bg-white px-4 py-2 rounded-full shadow-md">
                <Heart className="w-5 h-5 text-red-500 fill-red-500 animate-pulse" />
                <span>10,000+ Happy Learners</span>
              </div>
              <div className="flex items-center gap-2 bg-white px-4 py-2 rounded-full shadow-md">
                <TrendingUp className="w-5 h-5 text-green-500" />
                <span>Growing Daily</span>
              </div>
              <div className="flex items-center gap-2 bg-white px-4 py-2 rounded-full shadow-md">
                <Star className="w-5 h-5 text-yellow-500 fill-yellow-500" />
                <span>4.9/5 Rating</span>
              </div>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-24 bg-gradient-to-b from-transparent via-gray-50 dark:via-gray-800 to-transparent relative">
        <div className="container mx-auto px-4">
          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
            className="text-center mb-20"
          >
            <h2 className="text-5xl md:text-6xl font-black mb-6 bg-gradient-to-r from-gray-800 via-gray-700 to-gray-600 dark:from-white dark:via-gray-200 dark:to-gray-300 bg-clip-text text-transparent">
              Why Choose GyanDhara?
            </h2>
            <p className="text-2xl text-gray-600 dark:text-gray-300 font-medium max-w-3xl mx-auto">
              Your gateway to organized, accessible knowledge from historical archives with modern AI technology
            </p>
          </motion.div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-7xl mx-auto">
            {features.map((feature, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1, duration: 0.6 }}
                whileHover={{ y: -10, scale: 1.02 }}
                className="group relative bg-white rounded-3xl p-8 shadow-xl hover:shadow-2xl transition-all duration-300 border border-gray-100 overflow-hidden"
              >
                {/* Gradient Background on Hover */}
                <motion.div
                  className={`absolute inset-0 bg-gradient-to-br ${feature.gradient} opacity-0 group-hover:opacity-5 transition-opacity duration-300`}
                />

                {/* Icon Container */}
                <motion.div
                  whileHover={{ rotate: [0, -10, 10, -10, 0], scale: 1.1 }}
                  transition={{ duration: 0.5 }}
                  className={`relative w-20 h-20 mb-6 bg-gradient-to-br ${feature.gradient} rounded-2xl flex items-center justify-center text-white shadow-lg group-hover:shadow-xl transition-shadow`}
                >
                  {feature.icon}
                </motion.div>

                <h3 className="text-2xl font-bold mb-4 text-gray-800 dark:text-white group-hover:text-transparent group-hover:bg-gradient-to-r group-hover:bg-clip-text group-hover:from-blue-600 group-hover:to-purple-600 transition-all">
                  {feature.title}
                </h3>
                <p className="text-gray-600 dark:text-gray-300 text-lg leading-relaxed">
                  {feature.description}
                </p>

                {/* Corner Decoration */}
                <div className="absolute top-4 right-4 w-16 h-16 bg-gradient-to-br from-blue-100 to-purple-100 dark:from-blue-900 dark:to-purple-900 rounded-full opacity-0 group-hover:opacity-100 blur-2xl transition-opacity" />
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-24 bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 text-white relative overflow-hidden">
        {/* Animated Background Pattern */}
        <div className="absolute inset-0 opacity-10">
          {[...Array(20)].map((_, i) => (
            <motion.div
              key={i}
              className="absolute w-32 h-32 border border-white rounded-full"
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: [0, 1, 1], opacity: [0, 0.3, 0] }}
              transition={{ duration: 5, repeat: Infinity, delay: i * 0.5 }}
              style={{
                left: `${Math.random() * 100}%`,
                top: `${Math.random() * 100}%`,
              }}
            />
          ))}
        </div>

        <div className="container mx-auto px-4 relative z-10">
          <div className="grid md:grid-cols-4 gap-12 text-center">
            {[
              { number: '160,000+', label: 'Topics', icon: <BookOpen /> },
              { number: '18', label: 'Themes', icon: <Brain /> },
              { number: '12', label: 'Languages', icon: <Globe /> },
              { number: '100%', label: 'Free Forever', icon: <Heart className="fill-white" /> }
            ].map((stat, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, scale: 0.5 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1, type: "spring" }}
                whileHover={{ scale: 1.1, y: -5 }}
                className="group"
              >
                <motion.div
                  animate={{ rotate: [0, 5, -5, 0] }}
                  transition={{ duration: 3, repeat: Infinity, delay: index * 0.2 }}
                  className="mb-4 inline-block"
                >
                  <div className="w-16 h-16 mx-auto bg-white/20 backdrop-blur-lg rounded-2xl flex items-center justify-center text-white group-hover:bg-white/30 transition-colors">
                    {stat.icon}
                  </div>
                </motion.div>
                <div className="text-6xl font-black mb-3 text-white drop-shadow-2xl">
                  {stat.number}
                </div>
                <div className="text-2xl font-semibold text-white/90">{stat.label}</div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 bg-gradient-to-br from-gray-50 to-white relative overflow-hidden">
        <div className="container mx-auto px-4 text-center relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
            className="max-w-4xl mx-auto"
          >
            <motion.div
              animate={{ rotate: [0, 10, -10, 0] }}
              transition={{ duration: 3, repeat: Infinity }}
              className="text-8xl mb-6"
            >
              🚀
            </motion.div>
            <h2 className="text-5xl md:text-6xl font-black mb-6 bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 bg-clip-text text-transparent">
              Ready to Transform Your Learning?
            </h2>
            <p className="text-2xl mb-10 text-gray-700 font-medium">
              Join thousands of learners exploring historical knowledge with modern AI technology
            </p>
            <Link to="/signup">
              <motion.button
                whileHover={{ scale: 1.05, y: -5 }}
                whileTap={{ scale: 0.95 }}
                className="group bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 text-white font-black py-6 px-16 rounded-full text-2xl shadow-2xl hover:shadow-purple-500/50 transition-all duration-300 inline-flex items-center gap-4"
              >
                Get Started Free
                <ArrowRight className="w-8 h-8 group-hover:translate-x-2 transition-transform" />
              </motion.button>
            </Link>
            <p className="mt-6 text-gray-600 font-semibold">
              ✨ No credit card required • Start learning in 30 seconds
            </p>
          </motion.div>
        </div>
      </section>
    </div>
  );
}
